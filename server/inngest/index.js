import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

//Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } = event.data;

      const userData = {
        _id: id,
        email: email_addresses?.[0]?.email_address,
        name: `${first_name || ""} ${last_name || ""}`,
        image: image_url,
      };

      await User.create(userData);
      console.log("User Created:", userData);
    } catch (error) {
      console.log("Create User Error:", error.message);
    }
  }
);

//Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    try {
      const { id } = event.data;

      await User.findByIdAndDelete(id);
      console.log("User Deleted:", id);
    } catch (error) {
      console.log("Delete User Error:", error.message);
    }
  }
);

//Inngest Function to update user from database
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } = event.data;

      const userData = {
        email: email_addresses?.[0]?.email_address,
        name: `${first_name || ""} ${last_name || ""}`,
        image: image_url,
      };

      await User.findByIdAndUpdate(id, userData, { new: true });
      console.log("User Updated:", id);
    } catch (error) {
      console.log("Update User Error:", error.message);
    }
  }
);

//Inngest function to cancel booking and release seats of show after 10 minutes of booking created if payement is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: 'release-seats-delete-booking',
    triggers: [{ event: "app/checkPayment" }],
  },
  async ({ event, step }) => {

    const bookingId = event.data.bookingId;

    // Wait for 10 minutes
    await step.sleepUntil(
      'wait-for-10-minutes',
      new Date(Date.now() + 10 * 60 * 1000)
    );

    // Then run logic
    await step.run('check-payment-status', async () => {
      const booking = await Booking.findById(bookingId);

      // Safety check
      if (!booking) return;


      //If payment is not made , release seats and delete booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat]
        });
        show.markModified('occupiedSeats')
        await show.save()
        await Booking.findByIdAndDelete(booking._id)
      }
    })

  }
)


//Inngest Function to send email when user books a show
const sendBookingsConfirmationEmail = inngest.createFunction(
  {
    id: "send-booking-confirmation-email",
    triggers: [{ event: "app/show.booked" }],
  },
  async(event, step)=>{
     const {bookingId} = event.data;

     const booking = await Booking.findById(bookingId).populate({
      path: 'show',
      populate: {path: "movie", model:"Moie"}
     }).populate('user');

     await sendEmail({
      to: booking.user.email,
      subject:`Payment Confirmation: "${booking.show.movie.title}" booked! `,
      body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Hi ${booking.user.name},</h2>
      <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong>is confirmed.</p>
      <p>
      <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleString('en-US', {timeZone:
        'Asia/Kathmandu'
      })}<br/>
      <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleString('en-US', {timeZone:
        'Asia/Kathmandu'
      })}
      </p>
      <p>Enjoy the show! 🍿</p>
      <p>Thanks for booking with us!<br/>- Show-Time Teams</p>
      </div>`
     })
  }

)

// Export all functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingsConfirmationEmail
];