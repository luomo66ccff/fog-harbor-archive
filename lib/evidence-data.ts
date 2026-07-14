import type { Evidence } from "@/types/evidence";

export const evidence: Evidence[] = [
  { id: "ev-commission", index: "E-01", title: "匿名调查委托", type: "message", description: "潮汐_0 要求恢复 P-07-0712，并声称能看见调查进度。", acquiredAt: "会话开始", source: "收件箱", relatedPeople: [], relatedLocations: ["loc-archive"], relatedTime: "当前", critical: false, relatedEvidence: ["ev-case-file"] },
  { id: "ev-case-file", index: "E-02", title: "官方结案摘要", type: "document", description: "将事件定性为暴雨中的意外落水，并刻意排除船舶记录。", acquiredAt: "档案恢复", source: "案情卷宗", relatedPeople: ["lin-zhixia"], relatedLocations: ["loc-pier7"], relatedTime: "00:54", critical: true, relatedEvidence: ["ev-weather", "ev-closure-order"] },
  { id: "ev-duty", index: "E-03", title: "夜班签到与校时表", type: "record", description: "周既明的监控室时间为手写补录；叶澜没有门禁编号。", acquiredAt: "档案恢复", source: "系统科纸本", relatedPeople: ["zhou-jiming", "ye-lan"], relatedLocations: ["loc-control"], relatedTime: "00:42", critical: true, relatedEvidence: ["ev-offset", "ev-fake-clerk"] },
  { id: "ev-port-log", index: "E-04", title: "七号泊位进港记录", type: "record", description: "00:20 有无 AIS 船只靠泊，擦除压痕指向 H-1707；00:24 实卸 12.1 吨。", acquiredAt: "档案恢复", source: "夜班调度台", relatedPeople: ["gu-weian"], relatedLocations: ["loc-gate"], relatedTime: "00:20", critical: true, relatedEvidence: ["ev-photo", "ev-manifest"] },
  { id: "ev-weather", index: "E-05", title: "自动气象站原始日志", type: "record", description: "整夜降水 0.0mm；暴雨警报是事后无来源补录。", acquiredAt: "档案恢复", source: "AWS-3 缓存", relatedPeople: ["lin-zhixia", "xu-wancheng"], relatedLocations: ["loc-weather"], relatedTime: "00:00—03:00", critical: true, relatedEvidence: ["ev-case-file", "ev-offset"] },
  { id: "ev-phone", index: "E-06", title: "最后通话元数据", type: "record", description: "林知夏最后拨给记者唐芷，通话开始于 00:39:12。", acquiredAt: "档案恢复", source: "通信节点", relatedPeople: ["lin-zhixia", "tang-zhi"], relatedLocations: ["loc-weather"], relatedTime: "00:39", critical: true, relatedEvidence: ["ev-audio-0712", "ev-draft"] },
  { id: "ev-offset", index: "E-07", title: "十一分钟校时差", type: "record", description: "岸钟 00:31 与系统补录 00:42 构成稳定的十一分钟偏移。", acquiredAt: "完成时间表比对", source: "交叉验证", relatedPeople: ["zhou-jiming"], relatedLocations: ["loc-control"], relatedTime: "00:31", critical: true, unlockAfter: "schedule", relatedEvidence: ["ev-duty", "ev-cctv"] },
  { id: "ev-audio-0712", index: "E-08", title: "纸带高频口令 0712", type: "audio", description: "高通、0.75 倍速与后半段定位共同显露案件日期口令。", acquiredAt: "完成录音解析", source: "纸带 A", relatedPeople: ["lin-zhixia", "tang-zhi"], relatedLocations: ["loc-archive"], relatedTime: "00:39", critical: true, unlockAfter: "frequency", relatedEvidence: ["ev-phone", "ev-photo"] },
  { id: "ev-photo-packet", index: "E-09", title: "撕碎的港口照片", type: "photo", description: "六片被塞入损坏扫描仪的银盐照片。", acquiredAt: "口令 0712 通过", source: "监控室扫描仪", relatedPeople: ["chen-mu"], relatedLocations: ["loc-pier7"], relatedTime: "00:43", critical: false, unlockAfter: "frequency", relatedEvidence: ["ev-photo", "ev-cctv"] },
  { id: "ev-photo", index: "E-10", title: "白鹭七号完整照片", type: "photo", description: "拼合后可见船号 H-1707，水面倒影中另有一名救援者。", acquiredAt: "完成照片拼合", source: "监控室扫描仪", relatedPeople: ["gu-weian", "chen-mu"], relatedLocations: ["loc-pier7"], relatedTime: "00:43", critical: true, unlockAfter: "photo", relatedEvidence: ["ev-port-log", "ev-toolbox", "ev-manifest"] },
  { id: "ev-cctv", index: "E-11", title: "监控岸钟倒影", type: "photo", description: "画面系统时间 00:42，玻璃倒影里的机械岸钟为 00:31。", acquiredAt: "放大完整照片", source: "CCTV-7", relatedPeople: ["zhou-jiming"], relatedLocations: ["loc-control", "loc-pier7"], relatedTime: "00:31", critical: true, unlockAfter: "photo", relatedEvidence: ["ev-offset", "ev-photo"] },
  { id: "ev-toolbox", index: "E-12", title: "陈牧的检修工具箱", type: "object", description: "工具箱留在外侧检修梯，证明陈牧的证词并不完整。", acquiredAt: "放大完整照片", source: "七号泊位下层", relatedPeople: ["chen-mu", "lin-zhixia"], relatedLocations: ["loc-pier7"], relatedTime: "00:47", critical: false, unlockAfter: "photo", relatedEvidence: ["ev-photo", "ev-voiceprint"] },
  { id: "ev-fake-clerk", index: "E-13", title: "不存在的值班员叶澜", type: "document", description: "账号在虚构签退后才创建，且创建者为周既明。", acquiredAt: "最终档案解锁", source: "人事备份", relatedPeople: ["zhou-jiming", "ye-lan"], relatedLocations: ["loc-archive"], relatedTime: "03:04", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-duty", "ev-closure-order"] },
  { id: "ev-manifest", index: "E-14", title: "H-1707 货物复印件", type: "document", description: "白鹭七号卸下十二只带‘栖潮’圆章的铅封桶。", acquiredAt: "最终档案解锁", source: "澜汐航运", relatedPeople: ["gu-weian"], relatedLocations: ["loc-gate"], relatedTime: "00:24—01:07", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-photo", "ev-payment", "ev-seven-map"] },
  { id: "ev-payment", index: "E-15", title: "异常付款批次", type: "record", description: "澜汐航运在事发后向周既明与顾惟安关联账户付款。", acquiredAt: "最终档案解锁", source: "审计碎片", relatedPeople: ["zhou-jiming", "gu-weian"], relatedLocations: ["loc-archive"], relatedTime: "2019.07.16", critical: false, unlockAfter: "deduction", relatedEvidence: ["ev-manifest", "ev-closure-order"] },
  { id: "ev-notebook", index: "E-16", title: "林知夏的观测笔记", type: "object", description: "写有‘屏幕快十一分钟’与七个潮位坐标。", acquiredAt: "最终档案解锁", source: "气象站抽屉", relatedPeople: ["lin-zhixia", "xu-wancheng"], relatedLocations: ["loc-weather"], relatedTime: "00:34", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-weather", "ev-seven-map"] },
  { id: "ev-draft", index: "E-17", title: "唐芷未寄出的稿件", type: "document", description: "标题为《没有下雨的溺亡夜》，明确记录‘白鹭七号在卸货’。", acquiredAt: "完成照片拼合", source: "编辑部草稿", relatedPeople: ["tang-zhi", "lin-zhixia"], relatedLocations: ["loc-pier7"], relatedTime: "00:57", critical: false, unlockAfter: "photo", relatedEvidence: ["ev-phone", "ev-manifest"] },
  { id: "ev-closure-order", index: "E-18", title: "提前签发的封存指令", type: "document", description: "03:10 已写好暴雨落水口径，比家属报案早七十五分钟。", acquiredAt: "最终档案解锁", source: "联合办公室", relatedPeople: ["zhou-jiming"], relatedLocations: ["loc-archive"], relatedTime: "03:10", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-case-file", "ev-fake-clerk"] },
  { id: "ev-voiceprint", index: "E-19", title: "匿名委托人声纹", type: "audio", description: "潮汐_0 的呼吸间隔与林知夏最后通话一致；她承认被陈牧救起。", acquiredAt: "识破委托人", source: "实时缓存", relatedPeople: ["lin-zhixia", "chen-mu"], relatedLocations: ["loc-archive"], relatedTime: "当前", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-commission", "ev-toolbox", "ev-final-chain"] },
  { id: "ev-final-chain", index: "E-20", title: "完整责任链", type: "record", description: "周既明在 00:31 进入监控室校准主时钟，以掩盖白鹭七号靠泊。", acquiredAt: "完成关系推理", source: "调查重建", relatedPeople: ["zhou-jiming", "lin-zhixia"], relatedLocations: ["loc-control"], relatedTime: "00:31", critical: true, unlockAfter: "deduction", relatedEvidence: ["ev-offset", "ev-cctv", "ev-manifest"] },
  { id: "ev-seven-map", index: "E-21", title: "七港潮位镜像图", type: "photo", description: "将地图背面的镜像坐标翻转后，显示栖潮计划的七处沿岸节点。", acquiredAt: "完成隐藏口令", source: "地图背面", relatedPeople: ["lin-zhixia"], relatedLocations: ["loc-archive"], relatedTime: "七年周期", critical: true, unlockAfter: "hidden", relatedEvidence: ["ev-notebook", "ev-manifest"] },
];

export const initialEvidenceIds = [
  "ev-commission",
  "ev-case-file",
  "ev-duty",
  "ev-port-log",
  "ev-weather",
  "ev-phone",
];

export const puzzleRewards: Record<string, string[]> = {
  schedule: ["ev-offset"],
  frequency: ["ev-audio-0712", "ev-photo-packet"],
  photo: ["ev-photo", "ev-cctv", "ev-toolbox", "ev-draft"],
  deduction: ["ev-fake-clerk", "ev-manifest", "ev-payment", "ev-notebook", "ev-closure-order", "ev-final-chain"],
  hidden: ["ev-seven-map"],
};
