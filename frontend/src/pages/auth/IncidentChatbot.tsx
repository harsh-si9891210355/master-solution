import { useEffect, useRef, useState } from "react";
import "./IncidentChatbot.css";
import { FaRobot } from "react-icons/fa";
import { IoSend, IoClose, IoCloudUploadOutline } from "react-icons/io5";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sender = "bot" | "user";

type Message = {
    sender: Sender;
    text: string;
    time: string;
    card?: IncidentData;
};

type Assignee = {
    name: string;
    role: string;
    initials: string;
    color: string;
    bg: string;
};

type IncidentData = {
    type: string;
    severity: string;
    zone: string;
    assignee: Assignee;
    description: string;
    photo: string | null;
    ticketId: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const INCIDENT_TYPES = [
    { emoji: "🔓", label: "Intrusion" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "⚡", label: "Failure" },
    { emoji: "📷", label: "Camera Down" },
    { emoji: "🚨", label: "Alarm" },
];

const SEVERITY_LEVELS = [
    { emoji: "🟢", label: "Low" },
    { emoji: "🟡", label: "Medium" },
    { emoji: "🔴", label: "High" },
];

const ZONES = [
    { icon: "🏢", label: "Block A" },
    { icon: "🏭", label: "Block B" },
    { icon: "🚗", label: "Parking" },
    { icon: "🚪", label: "Main Gate" },
    { icon: "🖥️", label: "Server Room" },
    { icon: "🏞️", label: "Outdoor" },
];

export const ASSIGNEES: Assignee[] = [
    { name: "Ahmed Raza",  role: "Head of Security", initials: "AR", color: "#6d28d9", bg: "#ede9fe" },
    { name: "Sara Khan",   role: "Supervisor",        initials: "SK", color: "#0e7490", bg: "#cffafe" },
    { name: "James Liu",   role: "Guard – Zone A",    initials: "JL", color: "#0f766e", bg: "#ccfbf1" },
    { name: "Priya Singh", role: "Guard – Zone B",    initials: "PS", color: "#b45309", bg: "#fef3c7" },
    { name: "Malik Omar",  role: "Fire Warden",       initials: "MO", color: "#be123c", bg: "#ffe4e6" },
    { name: "Layla Noor",  role: "Ops Manager",       initials: "LN", color: "#4338ca", bg: "#e0e7ff" },
];

// Steps: 0=type 1=severity 2=zone 3=assignee 4=description 5=photo 6=done
const STEP_LABELS = ["Type", "Severity", "Zone", "Assign", "Details", "Photo", "Done"];
const STEP_PROGRESS = [4, 18, 34, 50, 66, 82, 100];

function getNow() {
    const d = new Date();
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function genTicket() {
    return "INC-" + Math.floor(1000 + Math.random() * 9000);
}

// ─── Component ────────────────────────────────────────────────────────────────

const IncidentChatbot = ({ visible, onHide }: { visible: boolean; onHide: () => void }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [step, setStep] = useState<number>(0);
    const [typing, setTyping] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [input, setInput] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [data, setData] = useState<Partial<IncidentData>>({});

    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const scrollBottom = () => setTimeout(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, 60);

    const addBot = (text: string, card?: IncidentData) => {
        setMessages(p => [...p, { sender: "bot", text, time: getNow(), card }]);
        scrollBottom();
    };
    const addUser = (text: string) => {
        setMessages(p => [...p, { sender: "user", text, time: getNow() }]);
        scrollBottom();
    };

    const botSay = (text: string, nextStep: number, delay = 950) => {
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            addBot(text);
            setStep(nextStep);
            setActiveStep(nextStep);
        }, delay);
    };

    // Reset on open
    useEffect(() => {
        if (visible) {
            setMessages([]);
            setStep(0);
            setActiveStep(0);
            setData({});
            setPhotoFile(null);
            setInput("");
            setTyping(true);
            setTimeout(() => {
                setTyping(false);
                addBot("Hello! 👋 I'm your VisionX Incident Assistant.\nWhat type of incident are you reporting?");
                setStep(0);
            }, 900);
        }
    }, [visible]);

    useEffect(() => {
        if (step === 4 && inputRef.current) inputRef.current.focus();
    }, [step]);

    // ── Option handlers ────────────────────────────────────────────────────────

    const pickType = (label: string, emoji: string) => {
        addUser(`${emoji} ${label}`);
        setData(d => ({ ...d, type: label }));
        botSay("How severe is this incident?", 1);
    };

    const pickSeverity = (label: string, emoji: string) => {
        addUser(`${emoji} ${label}`);
        setData(d => ({ ...d, severity: label }));
        botSay("Which zone or location did this occur?", 2);
    };

    const pickZone = (label: string, icon: string) => {
        addUser(`${icon} ${label}`);
        setData(d => ({ ...d, zone: label }));
        botSay("Who should we assign this incident to?", 3);
    };

    const pickAssignee = (assignee: Assignee) => {
        addUser(`${assignee.initials} — ${assignee.name}`);
        setData(d => ({ ...d, assignee }));
        botSay("Great. Please describe what happened — include the time and any affected systems.", 4);
    };

    const sendDescription = () => {
        if (!input.trim()) return;
        addUser(input.trim());
        setData(d => ({ ...d, description: input.trim() }));
        setInput("");
        botSay("Got it! Finally, would you like to attach a photo or evidence file?", 5);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            addUser(`📎 Photo attached: ${file.name}`);
        }
    };

    const submitIncident = (withPhoto: boolean) => {
        const finalData: IncidentData = {
            ...(data as IncidentData),
            photo: withPhoto && photoFile ? photoFile.name : null,
            ticketId: genTicket(),
        };
        setData(finalData);
        setTyping(true);
        setTimeout(() => {
            setTyping(false);
            addBot("Perfect. Here is your complete incident report:");
            setTimeout(() => {
                addBot("", finalData);
                setStep(6);
                setActiveStep(6);
            }, 350);
        }, 1000);
    };

    if (!visible) return null;

    const progressPct = STEP_PROGRESS[activeStep] ?? 100;

    return (
        <div className="vx-chatbot">

            {/* ── Header ── */}
            <div className="vx-header">
                <div className="vx-orb vx-orb1" /><div className="vx-orb vx-orb2" />
                <div className="vx-header-top">
                    <div className="vx-bot-icon"><FaRobot size={18} /></div>
                    <div className="vx-header-info">
                        <h2>VisionX Assistant</h2>
                        <p><span className="vx-online-dot" />Online &mdash; AIVMS Incident Desk</p>
                    </div>
                    <button className="vx-close-btn" onClick={onHide} aria-label="Close"><IoClose size={16} /></button>
                </div>
                <div className="vx-progress-bar">
                    <div className="vx-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="vx-step-labels">
                    {STEP_LABELS.map((l, i) => (
                        <span key={l} className={`vx-step-label ${i === activeStep ? "active" : ""}`}>{l}</span>
                    ))}
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="vx-body" ref={bodyRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`vx-msg-row ${msg.sender === "user" ? "user" : ""}`}>
                        {msg.sender === "bot" && <div className="vx-avatar"><FaRobot size={13} /></div>}
                        <div className={`vx-bubble ${msg.sender}`}>
                            {msg.card ? <IncidentCard card={msg.card} /> : <span style={{ whiteSpace: "pre-line" }}>{msg.text}</span>}
                            <span className="vx-time">{msg.time}</span>
                        </div>
                    </div>
                ))}
                {typing && (
                    <div className="vx-msg-row">
                        <div className="vx-avatar"><FaRobot size={13} /></div>
                        <div className="vx-typing-bubble">
                            <span className="vx-dot" /><span className="vx-dot" /><span className="vx-dot" />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="vx-footer">

                {/* Step 0 — Incident type */}
                {step === 0 && (
                    <div className="vx-options">
                        {INCIDENT_TYPES.map(t => (
                            <button key={t.label} className="vx-opt-btn" onClick={() => pickType(t.label, t.emoji)}>
                                <span>{t.emoji}</span>{t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 1 — Severity */}
                {step === 1 && (
                    <div className="vx-options">
                        {SEVERITY_LEVELS.map(s => (
                            <button key={s.label} className={`vx-opt-btn sev-${s.label.toLowerCase()}`} onClick={() => pickSeverity(s.label, s.emoji)}>
                                <span>{s.emoji}</span>{s.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 2 — Zone */}
                {step === 2 && (
                    <div className="vx-zone-grid">
                        {ZONES.map(z => (
                            <button key={z.label} className="vx-zone-btn" onClick={() => pickZone(z.label, z.icon)}>
                                <span className="vx-zone-icon">{z.icon}</span>
                                {z.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 3 — Assignee */}
                {step === 3 && (
                    <div className="vx-assignee-grid">
                        {ASSIGNEES.map(a => (
                            <button key={a.name} className="vx-ag-btn" onClick={() => pickAssignee(a)}>
                                <div className="vx-ag-av" style={{ background: a.bg, color: a.color }}>{a.initials}</div>
                                <div>
                                    <div className="vx-ag-name">{a.name}</div>
                                    <div className="vx-ag-role">{a.role}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 4 — Description */}
                {step === 4 && (
                    <div className="vx-input-row">
                        <input
                            ref={inputRef}
                            className="vx-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendDescription()}
                            placeholder="Describe what happened…"
                        />
                        <button className="vx-send-btn" onClick={sendDescription} aria-label="Send">
                            <IoSend size={14} />
                        </button>
                    </div>
                )}

                {/* Step 5 — Photo */}
                {step === 5 && (
                    <div>
                        {!photoFile ? (
                            <>
                                <label className="vx-upload-area" htmlFor="vx-file-input">
                                    <input
                                        ref={fileRef}
                                        id="vx-file-input"
                                        type="file"
                                        accept="image/*,video/*,.pdf"
                                        style={{ display: "none" }}
                                        onChange={handlePhotoChange}
                                    />
                                    <IoCloudUploadOutline size={26} color="#6d28d9" />
                                    <div className="vx-ua-text">Tap to attach a photo or file</div>
                                    <div className="vx-ua-sub">JPG, PNG, PDF — optional</div>
                                </label>
                                <button className="vx-skip-btn" onClick={() => submitIncident(false)}>
                                    Skip — no attachment
                                </button>
                            </>
                        ) : (
                            <div className="vx-file-ready">
                                <span>✅ {photoFile.name}</span>
                                <button className="vx-submit-photo-btn" onClick={() => submitIncident(true)}>
                                    Submit incident →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 6 — Done */}
                {step === 6 && (
                    <div className="vx-success-banner">
                        <div className="vx-success-icon">✅</div>
                        <p>Incident submitted to AIVMS team</p>
                        <small>{data.assignee?.name} has been notified</small>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Incident summary card ────────────────────────────────────────────────────

function IncidentCard({ card }: { card: IncidentData }) {
    const sevClass = card.severity === "Low" ? "sev-low" : card.severity === "Medium" ? "sev-med" : "sev-high";
    return (
        <div className="vx-incident-card">
            <div className="vx-card-label">Incident Report</div>
            <div className="vx-card-row"><span>Type</span><strong>{card.type}</strong></div>
            <div className="vx-card-row"><span>Severity</span><span className={`vx-sev-badge ${sevClass}`}>{card.severity}</span></div>
            <div className="vx-card-row"><span>Zone</span><strong>{card.zone}</strong></div>
            <div className="vx-card-row">
                <span>Assigned to</span>
                <div className="vx-assignee-chip">
                    <div className="vx-chip-av" style={{ background: card.assignee.bg, color: card.assignee.color }}>
                        {card.assignee.initials}
                    </div>
                    <strong style={{ fontSize: 11 }}>{card.assignee.name}</strong>
                </div>
            </div>
            <div className="vx-card-desc-label">Details</div>
            <div className="vx-card-desc">{card.description}</div>
            {card.photo && (
                <div className="vx-card-photo">📎 {card.photo}</div>
            )}
            <div className="vx-ticket-id">{card.ticketId}</div>
        </div>
    );
}

export default IncidentChatbot;