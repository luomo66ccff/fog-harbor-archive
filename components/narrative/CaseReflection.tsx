import { useId } from "react";
import { BookOpenCheck, EyeOff, FilePenLine, HeartHandshake, ShieldAlert } from "lucide-react";

const responsibilityLayers = [
  {
    label: "恶意伪造",
    role: "主导者",
    person: "周既明",
    detail: "主动收款、快调主时钟、创建叶澜，并参与提前封存。事实、道德与法律责任在这里重合。",
    icon: ShieldAlert,
  },
  {
    label: "胁迫协助",
    role: "执行者 / 被胁迫协助者",
    person: "顾惟安",
    detail: "开闸、擦除记录并收下款项；女儿的医疗压力解释了选择，却不能抹去选择本身。",
    icon: HeartHandshake,
  },
  {
    label: "保护性隐瞒",
    role: "保护者",
    person: "许晚澄 / 陈牧",
    detail: "一个保留无雨缓存并延迟报警，一个隐瞒救援。谎言保护了林知夏，也让真相继续沉睡。",
    icon: EyeOff,
  },
  {
    label: "调查性改写",
    role: "失踪的证人",
    person: "唐芷",
    detail: "为保护消息源改写稿件中的身份细节。她保存了证据，却并非完全中立的记录者。",
    icon: FilePenLine,
  },
  {
    label: "身份自保",
    role: "身份自保者",
    person: "林知夏",
    detail: "活下来以后，她只能借匿名节点继续追查。生还不等于自由，公开也并非没有代价。",
    icon: BookOpenCheck,
  },
] as const;

export function CaseReflection() {
  const headingId = useId();
  return (
    <section className="case-reflection" aria-labelledby={headingId}>
      <header>
        <p className="eyebrow">CASE REFLECTION / RESPONSIBILITY</p>
        <h3 id={headingId}>不是所有谎言都相同</h3>
        <p>责任链确认了事实，但事实责任、道德责任、法律责任与保护性谎言并不完全重合。</p>
      </header>
      <div className="case-reflection__grid">
        {responsibilityLayers.map(({ label, role, person, detail, icon: Icon }) => (
          <article key={label}>
            <Icon size={17} aria-hidden="true" />
            <span>{role} · {label}</span>
            <strong>{person}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
