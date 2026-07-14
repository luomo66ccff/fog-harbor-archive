import type {
  EndingId,
  InvestigationTask,
  InvestigationTaskId,
  PuzzleId,
  TaskProgress,
  UnlockEventId,
  WindowId,
  WindowNavigationTarget,
} from "@/types/case";

export const moduleUnlocks: Partial<Record<WindowId, PuzzleId>> = {
  audio: "schedule",
  surveillance: "frequency",
  evidence: "photo",
  finale: "deduction",
};

interface InvestigationTaskDefinition {
  id: InvestigationTaskId;
  title: string;
  description: string;
  target: WindowNavigationTarget;
  puzzleId?: PuzzleId;
  progressTotal: number;
  progressUnit: string;
  hintLevels: readonly string[];
}

export interface InvestigationProgressContext {
  completedPuzzles: readonly PuzzleId[];
  currentEnding?: EndingId | null;
  taskProgress?: TaskProgress;
}

export interface LockedModuleAccess {
  unlocked: false;
  title: string;
  missing: string;
  reason: string;
  requiredPuzzle: PuzzleId;
  nextTarget: WindowNavigationTarget;
}

export type ModuleAccess = { unlocked: true } | LockedModuleAccess;

export interface UnlockNotificationDefinition {
  eventId: UnlockEventId;
  title: string;
  content: string;
  reason: string;
  target: WindowNavigationTarget;
}

const taskDefinitions: readonly InvestigationTaskDefinition[] = [
  {
    id: "restore-time",
    title: "找回被偷走的十一分钟",
    description: "比较同一事件在系统记录与物理记录中的时间，恢复可信的案件时序。",
    target: { windowId: "archive", tab: "schedule" },
    puzzleId: "schedule",
    progressTotal: 4,
    progressUnit: "份记录",
    hintLevels: [
      "先检查所有带有时间戳的来源，不要只相信手写补录。",
      "寻找同时出现在电子记录与物理记录里的同一个事件。",
      "岸钟、传感器与通信节点可以用来校验系统主时钟。",
    ],
  },
  {
    id: "repair-call",
    title: "修复最后通话",
    description: "调整纸带的播放与滤波条件，让被噪声遮住的高频信号重新可读。",
    target: { windowId: "audio", tab: "analyze" },
    puzzleId: "frequency",
    progressTotal: 2,
    progressUnit: "项信号步骤",
    hintLevels: [
      "先让播放速度稳定下来，再判断应该保留哪个频段。",
      "关键脉冲位于纸带后半段，参数正确后仍需要播放到对应区域。",
      "观察节奏分组，而不是把整段噪声当成一个连续信号。",
    ],
  },
  {
    id: "reconstruct-photo",
    title: "拼合密封照片",
    description: "复原监控室中的照片包，并检查船体与水线附近的异常细节。",
    target: { windowId: "surveillance" },
    puzzleId: "photo",
    progressTotal: 2,
    progressUnit: "处关键细节",
    hintLevels: [
      "先利用跨越碎片边缘的船体、水线与岸灯寻找连续关系。",
      "拼合完成后继续检查画面；照片本身仍然藏着两处关键信息。",
      "船体标识与码头边缘的动静分别回答了两个不同问题。",
    ],
  },
  {
    id: "close-chain",
    title: "闭合五段责任链",
    description: "把人物、时间、地点、行为与目的连成能被证据共同支持的责任链。",
    target: { windowId: "evidence", tab: "deduction" },
    puzzleId: "deduction",
    progressTotal: 5,
    progressUnit: "段关系",
    hintLevels: [
      "先从拥有系统主时钟权限的人开始核对。",
      "每一段关系都应能找到已核验证据支持，而不是只靠人物证词。",
      "真正被掩盖的是一项靠泊活动；用它反推行为与目的。",
    ],
  },
  {
    id: "review-finale",
    title: "阅读最终档案并作出选择",
    description: "复核完整责任链与匿名委托人的证词，决定真相最终去向。",
    target: { windowId: "finale" },
    progressTotal: 1,
    progressUnit: "项最终选择",
    hintLevels: [
      "不同选择要求的关键证据数量不同，可以先回到证据墙复核。",
      "匿名委托人的真实身份会影响隐藏档案是否能够继续打开。",
      "作出选择前，确认你已经阅读希望用于结论的关键证据。",
    ],
  },
] as const;

const moduleLockCopy: Partial<Record<WindowId, { title: string; missing: string; reason: string }>> = {
  audio: {
    title: "录音带修复台暂时不可访问",
    missing: "可信的系统时间偏移",
    reason: "必须先校准案件时间链，系统才会恢复纸带索引。",
  },
  surveillance: {
    title: "监控室暂时不可访问",
    missing: "纸带 A 的四位访问口令",
    reason: "密封照片包仍被监控室的离线访问控制锁定。",
  },
  evidence: {
    title: "证据墙暂时不可访问",
    missing: "密封照片的完整复原",
    reason: "船号与第二道人影尚未确认，关系图缺少必要节点。",
  },
  finale: {
    title: "最终档案暂时不可访问",
    missing: "完整的五段责任链",
    reason: "人物、时间、地点、行为与目的尚未被同一组证据闭合。",
  },
};

const unlockNotifications: Record<UnlockEventId, UnlockNotificationDefinition> = {
  schedule: {
    eventId: "schedule",
    title: "录音带修复台已恢复",
    content: "纸带 A 与频率分析设备现在可以访问。",
    reason: "案件时间偏移已经通过交叉记录验证。",
    target: { windowId: "audio", tab: "analyze" },
  },
  frequency: {
    eventId: "frequency",
    title: "监控室已恢复",
    content: "密封照片包已送入中央扫描仪。",
    reason: "纸带 A 的访问口令已经验证。",
    target: { windowId: "surveillance" },
  },
  photo: {
    eventId: "photo",
    title: "证据墙已开放",
    content: "照片、岸钟倒影与检修梯线索已进入关系图。",
    reason: "密封照片中的关键细节已经确认。",
    target: { windowId: "evidence", tab: "board" },
  },
  deduction: {
    eventId: "deduction",
    title: "最终档案已开放",
    content: "重建卷宗、封存指令与声纹比对现在可以访问。",
    reason: "五段责任链已经被现有证据闭合。",
    target: { windowId: "finale" },
  },
  anonymous: {
    eventId: "anonymous",
    title: "地图背面出现新字迹",
    content: "匿名声纹已确认，隐藏索引正在显影。",
    reason: "委托人的身份与最后通话声纹一致。",
    target: { windowId: "map", focusId: "hidden-index" },
  },
  hidden: {
    eventId: "hidden",
    title: "第七层索引已恢复",
    content: "隐藏档案的结局条件已经满足。",
    reason: "地图背面的镜像索引已经成功解密。",
    target: { windowId: "finale" },
  },
};

function taskIsComplete(
  definition: InvestigationTaskDefinition,
  completed: readonly PuzzleId[],
  currentEnding: EndingId | null | undefined,
) {
  return definition.puzzleId ? completed.includes(definition.puzzleId) : currentEnding !== null && currentEnding !== undefined;
}

function progressLabel(definition: InvestigationTaskDefinition, progress: TaskProgress | undefined, completed: boolean) {
  if (completed) return "已完成";
  const count = Math.min(definition.progressTotal, new Set(progress?.[definition.id] ?? []).size);
  return `已检查 ${count}/${definition.progressTotal} ${definition.progressUnit}`;
}

export function getInvestigationTasks(context: InvestigationProgressContext): InvestigationTask[] {
  return taskDefinitions.map((definition) => {
    const completed = taskIsComplete(definition, context.completedPuzzles, context.currentEnding);
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      targetWindow: definition.target.windowId,
      targetTab: definition.target.tab,
      targetFocusId: definition.target.focusId,
      puzzleId: definition.puzzleId,
      progressLabel: progressLabel(definition, context.taskProgress, completed),
      completed,
      hintLevels: definition.hintLevels,
    };
  });
}

export function getCurrentInvestigationTask(context: InvestigationProgressContext): InvestigationTask {
  const tasks = getInvestigationTasks(context);
  return tasks.find((task) => !task.completed) ?? tasks[tasks.length - 1];
}

export function taskTarget(task: InvestigationTask): WindowNavigationTarget {
  return {
    windowId: task.targetWindow,
    ...(task.targetTab ? { tab: task.targetTab } : {}),
    ...(task.targetFocusId ? { focusId: task.targetFocusId } : {}),
  };
}

export function getModuleAccess(completed: readonly PuzzleId[], id: WindowId): ModuleAccess {
  const requiredPuzzle = moduleUnlocks[id];
  if (!requiredPuzzle || completed.includes(requiredPuzzle)) return { unlocked: true };
  const copy = moduleLockCopy[id];
  const currentTask = getCurrentInvestigationTask({ completedPuzzles: completed });
  return {
    unlocked: false,
    title: copy?.title ?? "模块暂时不可访问",
    missing: copy?.missing ?? "前置调查结果",
    reason: copy?.reason ?? "请先完成当前调查任务。",
    requiredPuzzle,
    nextTarget: taskTarget(currentTask),
  };
}

export function getUnlockNotification(eventId: UnlockEventId) {
  return unlockNotifications[eventId];
}

export function isPuzzleComplete(completed: readonly PuzzleId[], id: PuzzleId) {
  return completed.includes(id);
}

export function isModuleUnlocked(completed: readonly PuzzleId[], id: WindowId) {
  return getModuleAccess(completed, id).unlocked;
}

export function availablePuzzle(completed: readonly PuzzleId[], id: PuzzleId, anonymous = false) {
  if (id === "schedule") return true;
  if (id === "frequency") return completed.includes("schedule");
  if (id === "photo") return completed.includes("frequency");
  if (id === "deduction") return completed.includes("photo");
  return completed.includes("deduction") && anonymous;
}

export function calculateProgress(completed: readonly PuzzleId[], evidenceCount: number, anonymous: boolean) {
  const puzzleScore = completed.filter((id) => id !== "hidden").length * 17;
  const hiddenScore = completed.includes("hidden") ? 5 : 0;
  const evidenceScore = Math.min(12, Math.max(0, evidenceCount - 6));
  const identityScore = anonymous ? 5 : 0;
  return Math.min(100, 15 + puzzleScore + hiddenScore + evidenceScore + identityScore);
}

export function credibilityLabel(completed: readonly PuzzleId[], evidenceCount: number) {
  if (completed.includes("deduction")) return "证据链闭合";
  if (completed.includes("photo")) return "高度可信";
  if (evidenceCount > 7) return "交叉验证中";
  return "存疑";
}
