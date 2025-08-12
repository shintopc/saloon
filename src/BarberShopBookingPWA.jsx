import React, { useEffect, useMemo, useState } from "react";

/* ==========================
   Helper functions & utils
   ========================== */
function pad(n) { return n.toString().padStart(2, "0"); }
function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${pad(m)} ${ampm}`;
}
function timeStringToMinutes(t) {
  const [hh, mm] = t.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

/* ==========================
   Main component
   ========================== */
export default function BarberShopBookingPWA() {
  // Fixed shop timing and rules requested by you
  const [openTime] = useState("09:00");
  const [closeTime] = useState("20:00");
  const [slotMinutes] = useState(60); // 1 hour slots
  const [seatsPerSlot] = useState(5); // max 5 bookings per slot

  // Form + UI state
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ownerMode, setOwnerMode] = useState(false);
  const [message, setMessage] = useState(null);

  // bookings shape: { "YYYY-MM-DD": { "9:00 AM": [booking,...], ... }, ... }
  const [bookings, setBookings] = useState(() => {
    try {
      const raw = localStorage.getItem("bs_bookings");
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  // persist bookings
  useEffect(() => {
    try {
      localStorage.setItem("bs_bookings", JSON.stringify(bookings));
    } catch (e) {
      // ignore storage errors
    }
  }, [bookings]);

  // generate slots for a day
  const slots = useMemo(() => {
    const o = timeStringToMinutes(openTime);
    const c = timeStringToMinutes(closeTime);
    const res = [];
    for (let t = o; t < c; t += slotMinutes) res.push(t);
    return res.map((m) => ({ minutes: m, label: minutesToHHMM(m) }));
  }, [openTime, closeTime, slotMinutes]);

  const todaysBookings = bookings[selectedDate] || {};

  function countBooked(slotLabel) {
    const arr = todaysBookings[slotLabel] || [];
    return arr.length;
  }

  function clearMessageAfter(ms = 2500) {
    setTimeout(() => setMessage(null), ms);
  }

  function handleBook(slotLabel) {
    if (!name.trim()) return setMessage({ type: "error", text: "Enter your name." });
    const raw = whatsapp.replace(/[^0-9+]/g, "");
    if (raw.length < 7) return setMessage({ type: "error", text: "Invalid WhatsApp number." });

    const currentCount = countBooked(slotLabel);
    if (currentCount >= seatsPerSlot) return setMessage({ type: "error", text: "Slot full." });

    const newBooking = { id: Date.now(), name: name.trim(), whatsapp: raw, createdAt: new Date().toISOString() };
    setBookings((prev) => {
      const copy = { ...prev };
      if (!copy[selectedDate]) copy[selectedDate] = {};
      if (!copy[selectedDate][slotLabel]) copy[selectedDate][slotLabel] = [];
      copy[selectedDate][slotLabel] = [...copy[selectedDate][slotLabel], newBooking];
      return copy;
    });

    // UI feedback
    setMessage({ type: "success", text: `Booked ${slotLabel}` });
    clearMessageAfter();

    // open WhatsApp chats: customer and owner
    // Owner number replaced by request
    const customerMsg = encodeURIComponent(`Hi ${name}, your booking at ${slotLabel} on ${selectedDate} is confirmed.`);
    const ownerNumber = "9961583051";
    const ownerMsg = encodeURIComponent(`New booking: ${name}, ${raw}, Slot: ${slotLabel}, Date: ${selectedDate}`);

    try {
      // Customer chat
      if (raw) window.open(`https://wa.me/${raw.replace(/\+/g, "")}?text=${customerMsg}`, "_blank");
      // Owner chat
      if (ownerNumber && ownerNumber.length > 5) window.open(`https://wa.me/${ownerNumber}?text=${ownerMsg}`, "_blank");
    } catch (e) {
      // ignore popup errors (browsers may block)
    }

    // clear form
    setName("");
    setWhatsapp("");
  }

  function cancelBooking(slotLabel, id) {
    if (!confirm("Cancel this booking?")) return;
    setBookings((prev) => {
      const copy = { ...prev };
      if (!copy[selectedDate] || !copy[selectedDate][slotLabel]) return prev;
      copy[selectedDate][slotLabel] = copy[selectedDate][slotLabel].filter((b) => b.id !== id);
      return copy;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(#fff7ed,#fff1f2)" }}>
      <div style={{ maxWidth: 520, margin: "24px auto", padding: 18, background: "white", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.08)", border: "4px solid #fbbf24" }}>
        <h1 style={{ textAlign: "center", color: "#c2410c", fontSize: 22, marginBottom: 12, fontWeight: 700 }}>Barber Shop Booking</h1>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <button onClick={() => setOwnerMode((m) => !m)} style={{ background: "#7c3aed", color: "white", border: "none", padding: "8px 12px", borderRadius: 10, boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}>{ownerMode ? "Customer View" : "Owner Settings"}</button>
        </div>

        {ownerMode ? (
          <div>
            <p style={{ margin: 6 }}>Open Time: <strong>9:00 AM</strong></p>
            <p style={{ margin: 6 }}>Close Time: <strong>8:00 PM</strong></p>
            <p style={{ margin: 6 }}>Slot Duration: <strong>60 minutes</strong></p>
            <p style={{ margin: 6 }}>Max Bookings Per Slot: <strong>5</strong></p>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Selected day preview</h3>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "2px solid #f59e0b" }} />
              <div style={{ marginTop: 10 }}>
                {slots.map((s) => {
                  const c = countBooked(s.label);
                  return (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: c >= seatsPerSlot ? "#fed7d7" : "#ecfdf5", marginBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 13 }}>{c}/{seatsPerSlot} booked</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 13 }}>Your Name</label>
            <input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "2px solid #c084fc", marginBottom: 10 }} />

            <label style={{ fontSize: 13 }}>WhatsApp Number (with country code)</label>
            <input placeholder="e.g. +919xxxxxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "2px solid #c084fc", marginBottom: 12 }} />

            <label style={{ fontSize: 13 }}>Select Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "2px solid #fb923c", marginBottom: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 12 }}>
              {slots.map((s) => {
                const c = countBooked(s.label);
                const free = c < seatsPerSlot;
                return (
                  <button key={s.label} disabled={!free} onClick={() => handleBook(s.label)} style={{ padding: 12, borderRadius: 10, fontWeight: 700, boxShadow: free ? "0 6px 18px rgba(16,185,129,0.18)" : "none", border: "none", background: free ? "#34d399" : "#fca5a5", color: free ? "white" : "#7f1d1d" }}>
                    <div>{s.label}</div>
                    <div style={{ fontSize: 12 }}>{c}/{seatsPerSlot}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <div style={{ padding: 10, marginTop: 6, borderRadius: 8, background: message.type === "error" ? "#fecaca" : "#bbf7d0", color: message.type === "error" ? "#7f1d1d" : "#065f46", fontWeight: 700, textAlign: "center" }}>{message.text}</div>
        )}

        {/* Booking list for selected date (owner quick view) */}
        <div style={{ marginTop: 14 }}>
          <h4 style={{ marginBottom: 8 }}>Bookings on {selectedDate}</h4>
          <div>
            {Object.keys(todaysBookings).length === 0 && <div style={{ color: "#6b7280" }}>No bookings yet.</div>}
            {Object.keys(todaysBookings).sort().map((slot) => (
              <div key={slot} style={{ padding: 8, borderRadius: 8, background: "#f3f4f6", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{slot}</div>
                    {todaysBookings[slot].map((b) => (
                      <div key={b.id} style={{ fontSize: 13, marginTop: 6 }}>
                        {b.name} — {b.whatsapp} <button onClick={() => cancelBooking(slot, b.id)} style={{ marginLeft: 8, color: "#dc2626", background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
