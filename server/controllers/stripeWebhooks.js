// // import stripe from "stripe"
// // import Booking from "../models/Booking.js"

// // export const stripeWebhooks = async (request, response) => {
// //     const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
// //     const sig = request.headers["stripe-signature"];

// //     let event;

// //     try {
// //         event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
// //     } catch (error) {
// //         return response.status(400).send(`Webhook Error: ${error.message}`);
// //     }


// //     try {
// //         switch (event.type) {
// //             case "checkout.session.completed":{
// //                 const paymentIntent = event.data.object;
// //                 const sessionList = await stripeInstance.checkout.sessions.list({
// //                     payment_intent: paymentIntent.id
// //                 })

// //                 const session = sessionList.data[0]
// //                 const {bookingId} = session.metadata;

// //                 await Booking.findByIdAndUpdate(bookingId, {
// //                     isPaid: true,
// //                     paymentLink: ""
// //                 }) 
// //                 break;
// //             }
                
// //             default:
// //                console.log('Unhandled event type:', event.type)
// //         }
// //         response.json({received: true})
// //     } catch (err) {
// //         console.log("Webhook processing error:", err);
// //         response.status(500).send("Internal Server Error");
        
// //     }

// // }

import stripe from 'stripe'
import Booking from "../models/Booking.js"

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
        }

        res.json({ received: true });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};