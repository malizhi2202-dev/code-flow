"""渠道 API — Webhook 回调入口 + 渠道配置 CRUD."""
import datetime
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.channel_config import ChannelConfig, CHANNEL_TYPES, CHANNEL_STATUSES
from services.encryption_service import encrypt, decrypt
from services.chat_service import chat_service
from services.audit_service import log_audit

router = APIRouter(tags=["channels"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


def _get_adapter(channel_type: str):
    """动态加载适配器模块."""
    try:
        if channel_type == "feishu":
            from services.adapters.feishu import FeishuAdapter
            return FeishuAdapter()
        elif channel_type == "dingtalk":
            from services.adapters.dingtalk import DingTalkAdapter
            return DingTalkAdapter()
        elif channel_type == "slack":
            from services.adapters.slack import SlackAdapter
            return SlackAdapter()
        elif channel_type == "telegram":
            from services.adapters.telegram import TelegramAdapter
            return TelegramAdapter()
        elif channel_type == "smtp_email":
            from services.adapters.smtp_email import SMTPAdapter
            return SMTPAdapter()
        else:
            raise ValueError(f"不支持的渠道类型: {channel_type}")
    except ImportError as e:
        raise ValueError(f"渠道适配器加载失败: {channel_type} — {e}")


# ═══════════════════════════════════════════
# Webhook 回调入口
# ═══════════════════════════════════════════

@router.post("/api/channels/{channel_type}/callback/{webhook_uuid}")
async def channel_webhook(
    channel_type: str,
    webhook_uuid: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """渠道 webhook 统一回调入口."""
    # 1. 查 channel_config
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.webhook_uuid == webhook_uuid,
        ChannelConfig.channel_type == channel_type,
        ChannelConfig.status == "active",
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在或未激活")

    # 2. 解密凭证
    try:
        credentials = json.loads(decrypt(cfg.credentials_encrypted))
    except Exception:
        raise HTTPException(status_code=500, detail="凭证解密失败")

    # 3. 获取适配器
    try:
        adapter = _get_adapter(channel_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 4. 读取 body
    body = await request.body()
    headers = dict(request.headers)

    # 5. 签名校验
    if not adapter.validate_request(headers, body, credentials):
        log_audit(db, cfg.owner_id, "channel_webhook_fail", cfg.agent_id,
                  f"channel={channel_type} reason=signature_fail")
        raise HTTPException(status_code=401, detail="签名校验失败")

    # 6. 解析消息
    try:
        raw = json.loads(body) if body else {}
    except json.JSONDecodeError:
        raw = {"_raw_body": body.decode("utf-8", errors="replace")}
    universal_msg = adapter.parse_message(raw)

    # 7. 路由到 Agent
    try:
        result = chat_service.send_message(
            agent_id=cfg.agent_id,
            content=universal_msg.content,
            owner_id=cfg.owner_id,
            db=db,
            conversation_id=None,
            channel_type=channel_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent 处理失败: {e}")

    # 8. 推送回复到渠道
    try:
        channel_msg_id = adapter.send_message(
            universal_msg if result.get("error") else type("UM", (), {
                "content": result.get("agent_message", {}).get("content", ""),
                "attachments": [],
            })(),
            credentials,
            universal_msg.conversation_id,
        )

        # 9. 如果 Agent 响应 > 3s，先回占位再更新（飞书/Telegram 支持）
        if hasattr(adapter, "update_message") and not result.get("error"):
            full_reply = result.get("agent_message", {}).get("content", "")
            if full_reply != universal_msg.content and channel_msg_id:
                adapter.update_message(channel_msg_id, full_reply, credentials)

        return {"ok": True, "channel_message_id": channel_msg_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"渠道推送失败: {e}")


# ═══════════════════════════════════════════
# 渠道配置 CRUD
# ═══════════════════════════════════════════

@router.get("/api/agents/{agent_id}/channels")
def list_channels(agent_id: int, request: Request, db: Session = Depends(get_db)):
    """获取 Agent 的所有渠道配置."""
    owner_id = _uid(request)
    channels = db.query(ChannelConfig).filter(
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).order_by(ChannelConfig.created_at.desc()).all()
    return [c.to_dict() for c in channels]


@router.post("/api/agents/{agent_id}/channels")
def create_channel(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """为 Agent 添加渠道配置."""
    owner_id = _uid(request)
    channel_type = payload.get("channel_type", "")
    if channel_type not in CHANNEL_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的渠道类型: {channel_type}，支持: {CHANNEL_TYPES}")

    credentials = payload.get("credentials", {})
    if not credentials:
        raise HTTPException(status_code=400, detail="渠道凭证不能为空")

    cfg = ChannelConfig(
        agent_id=agent_id,
        owner_id=owner_id,
        channel_type=channel_type,
        credentials_encrypted=encrypt(json.dumps(credentials, ensure_ascii=False)),
        status="draft",
        webhook_uuid=uuid.uuid4().hex,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return {"ok": True, "channel": cfg.to_dict()}


@router.put("/api/agents/{agent_id}/channels/{channel_id}")
def update_channel(agent_id: int, channel_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """更新渠道配置."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")

    if "credentials" in payload:
        cfg.credentials_encrypted = encrypt(json.dumps(payload["credentials"], ensure_ascii=False))
    if "enabled" in payload:
        cfg.enabled = payload["enabled"]
    if "status" in payload and payload["status"] in CHANNEL_STATUSES:
        cfg.status = payload["status"]
    cfg.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(cfg)
    return {"ok": True, "channel": cfg.to_dict()}


@router.delete("/api/agents/{agent_id}/channels/{channel_id}")
def delete_channel(agent_id: int, channel_id: int, request: Request, db: Session = Depends(get_db)):
    """删除渠道配置."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")
    db.delete(cfg)
    db.commit()
    return {"ok": True}


@router.post("/api/agents/{agent_id}/channels/{channel_id}/test")
def test_channel(agent_id: int, channel_id: int, request: Request, db: Session = Depends(get_db)):
    """测试渠道连接."""
    owner_id = _uid(request)
    cfg = db.query(ChannelConfig).filter(
        ChannelConfig.id == channel_id,
        ChannelConfig.agent_id == agent_id,
        ChannelConfig.owner_id == owner_id,
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="渠道配置不存在")

    try:
        adapter = _get_adapter(cfg.channel_type)
        credentials = json.loads(decrypt(cfg.credentials_encrypted))
        # 调用适配器的自我检测能力
        info = adapter.get_channel_info()
        cfg.status = "active"
        cfg.updated_at = datetime.datetime.utcnow()
        db.commit()
        return {"ok": True, "channel_info": {"type": info.channel_type, "name": info.display_name, "icon": info.icon}}
    except Exception as e:
        # 连接失败
        cfg.status = "error"
        cfg.updated_at = datetime.datetime.utcnow()
        db.commit()
        return {"ok": False, "detail": str(e)[:200]}
