import nodemailer from "nodemailer";

export const sendETicketEmail = async (booking) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const passengersHtml = booking.passengers
    .map(
      (p) => `
      <tr>
        <td>${p.firstName} ${p.lastName}</td>
        <td>${p.type}</td>
      </tr>
    `,
    )
    .join("");

  await transporter.sendMail({
    from: `"Your Travel Agency" <${process.env.EMAIL_USER}>`,
    to: booking.contactInfo.email,
    subject: "✈ Your E-Ticket Confirmation",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Booking Confirmed 🎉</h2>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>PNR:</strong> ${booking.pnr}</p>
        <p><strong>Airline:</strong> ${booking.offerSnapshot.airline.name}</p>
        <p><strong>Total Paid:</strong> ${booking.totalAmount} ${booking.offerSnapshot.currency}</p>
        <h3>Passengers</h3>
        <table border="1" cellpadding="8">
          <tr>
            <th>Name</th>
            <th>Type</th>
          </tr>
          ${passengersHtml}
        </table>
        <p>Thank you for booking with us.</p>
      </div>
    `,
  });
};
