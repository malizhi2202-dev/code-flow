/** 自定义 Edge 组件注册表 — 6 种连线类型. */
import SequentialEdge from './SequentialEdge';
import ParallelEdge from './ParallelEdge';
import ForkEdge from './ForkEdge';
import MasterSlaveEdge from './MasterSlaveEdge';
import EventTriggerEdge from './EventTriggerEdge';
import RetryFallbackEdge from './RetryFallbackEdge';
import type { EdgeTypes } from '@xyflow/react';

export const customEdgeTypes: EdgeTypes = {
  sequential: SequentialEdge,
  parallel: ParallelEdge,
  fork: ForkEdge,
  'master-slave': MasterSlaveEdge,
  'event-trigger': EventTriggerEdge,
  'retry-fallback': RetryFallbackEdge,
};
