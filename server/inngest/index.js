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
  async({event, step})=>{
     const {bookingId} = event.data;

     const booking = await Booking.findById(bookingId).populate({
      path: 'show',
      populate: {path: "movie", model:"Movie"}
     }).populate('user');

      if (!booking || !booking.show || !booking.show.movie || !booking.user) {
      console.log("❌ Missing booking data");
      return;
    }

     await sendEmail({
      to: booking.user.email,
      subject:`Payment Confirmation: "${booking.show.movie.title}" booked! `,
      body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Hi ${booking.user.name},</h2>
       <p>Your booking is confirmed 🎉</p>
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
     });
       console.log("✅ Email sent");
  }

)

//Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  {
    id: "send-show-reminders",
    triggers:[{cron: "0 */8 * * *"}], //Every 8 hours

  },
  async({step})=>{
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    //Prepare reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async()=>{
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours},
      }).populate('movie');

      const tasks= [];

      for(const show  of shows){
        if(!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if(userIds.length === 0) continue;

        const users = await User.find({_id: {$in: userIds}}).select("name email");

        for(const user of users){
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          })
        }
      }
      return tasks;
    })

    if(reminderTasks.length === 0){
      return {sent: 0, message: "No reminders to send."}
    }


    //Send reminder emails
    const results = await step.run('send-all-reminders', async()=>{
      return await Promise.allSettled(
        reminderTasks.map(task => sendEmail({
          to: task.userEmail,
          subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
          body:`<div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello ${task.userName},</h2>
      <p>This is a quick reminder that your movie:</p>
      <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
      <p>
      is scheduled for
      <strong>${new Date(task.showTime).toLocaleString('en-US', {timeZone:
        'Asia/Kathmandu'
      })}</strong> at 
       <strong>${new Date(task.showTime).toLocaleString('en-US', {timeZone:
        'Asia/Kathmandu'
      })}</strong>. 
      </p>
      <p>It starts in approximately <strong>8 hours</strong>
      - make sure you're ready!
      </p>
      <p>Enjoy the show!<br/>- Show-Time Team</p>
      
      </div>`
        }))
      )
    })

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message:`sent ${sent} reminder(s), ${failed} failed`
    }
  }
)

//Inngest Function to send notifications when a new show is added
const sendNewNotifications= inngest.createFunction(
  {
    id:"send-new-show-notifications",
    triggers:[{event:"app/show.added"}]
  },
  async({event})=>{
    const {movieTitle} = event.data;

    const users = await User.find({})

    for(const user of users){
      const userEmail = user.email;
      const userName = user.name;

      const subject =`🎬 New Show Added: ${movieTitle}`;
      const body=`<div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hi ${userName},</h2>
      <p>We've just added a new show to our library:</p>
      <h3 style="color: #F84565;">"${movieTitle}"</h3>
      <p>Visit our website</p>
      <br/>
      <p>Thanks, <br/> Show-Time team</p>
      </div>`;
      await sendEmail({
        to: userEmail,
        subject,
        body,
      })

    }
    return {message: "Notifications sent."}

  }
)

// Export all functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingsConfirmationEmail,
  sendShowReminders,
  sendNewNotifications
];