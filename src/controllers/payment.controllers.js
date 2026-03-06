import paypalClient from "../config/paypal.js";
import paypal from "@paypal/checkout-server-sdk";
import Booking from "../models/booking.model.js";
import {
  createDuffelOrder,
  confirmDuffelPayment,
} from "../services/duffel.service.js";
import { sendETicketEmail } from "../services/email.service.js";

/* =====================================================
   STEP 1 – CREATE PAYPAL ORDER
===================================================== */

export const createPaypalOrder = async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.paymentStatus === "paid")
    return res.status(400).json({ message: "Already paid" });

  if (booking.bookingStatus !== "draft")
    return res.status(400).json({ message: "Invalid booking status" });

  // 1️⃣ Create Duffel order (hold seats) if not exists
  if (!booking.duffelOrderId) {
    const duffelOrder = await createDuffelOrder(booking);
    booking.duffelOrderId = duffelOrder.id;
    booking.bookingStatus = "pending";
    await booking.save();
  }

  // 2️⃣ Create PayPal order
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: booking._id.toString(),
        amount: {
          currency_code: booking.offerSnapshot.currency,
          value: booking.totalAmount.toFixed(2),
        },
      },
    ],
  });

  const order = await paypalClient.execute(request);

  res.json({
    paypalOrderId: order.result.id,
    approvalUrl: order.result.links.find((l) => l.rel === "approve")?.href,
  });
};

/* =====================================================
   STEP 2 – CAPTURE PAYMENT + CONFIRM DUFFEL
===================================================== */

export const capturePaypalPayment = async (req, res) => {
  const { bookingId } = req.params;
  const { paypalOrderId } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.paymentStatus === "paid")
    return res.status(400).json({ message: "Already processed" });

  // 1️⃣ Capture PayPal payment
  const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
  request.requestBody({});

  const capture = await paypalClient.execute(request);

  if (capture.result.status !== "COMPLETED")
    return res.status(400).json({ message: "Payment failed" });

  const captureData = capture.result.purchase_units[0].payments.captures[0];

  // 2️⃣ Verify amount
  if (captureData.amount.value !== booking.totalAmount.toFixed(2))
    return res.status(400).json({ message: "Amount mismatch" });

  // 3️⃣ Confirm Duffel payment (issue ticket)
  const confirmedOrder = await confirmDuffelPayment(booking);

  // 4️⃣ Extract PNR & tickets
  booking.pnr = confirmedOrder.booking_reference;
  booking.ticketNumbers =
    confirmedOrder.passengers?.map((p) => p.ticket_number) || [];

  // 5️⃣ Store PayPal details
  booking.paypalOrderId = capture.result.id;
  booking.paypalCaptureId = captureData.id;
  booking.paypalPayerId = capture.result.payer?.payer_id;
  booking.paypalStatus = capture.result.status;

  booking.paymentStatus = "paid";
  booking.bookingStatus = "confirmed";

  await booking.save();

  // 6️⃣ Send e-ticket email
  await sendETicketEmail(booking);

  res.json({
    success: true,
    message: "Booking confirmed & E-ticket sent",
  });
};
