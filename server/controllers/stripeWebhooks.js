
import stripe from 'stripe'
import Booking from "../models/Booking.js"
import { inngest } from '../inngest/index.js';

export const stripeWebhooks = async (req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const bookingId = session.metadata?.bookingId;
            
            if (!bookingId) {
                return res.json({ received: true, error: "No bookingId" });
            }

            await Booking.findByIdAndUpdate(
                bookingId,
                {
                    isPaid: true,
                    paymentLink: ""
                },

                { new: true }
            );
               //Send Confirmation Email
                await inngest.send({
                    name: "app/show.booked",
                    data:{bookingId}
                });
        }

        res.json({ received: true });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};