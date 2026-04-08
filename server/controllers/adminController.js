
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
// import {clerkClient, getAuth } from "@clerk/express";




//API to check if user is admin
export const isAdmin = async(req, res)=>{
    res.json({success:true, isAdmin: true});
}

// export const isAdmin = async (req, res) => {
//     try {
//         const { userId } = getAuth(req);

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Not logged in"
//             });
//         }

//         const user = await clerkClient.users.getUser(userId);

//         const role = user?.privateMetadata?.role;

       

//         res.json({
//             success: true,
//             isAdmin: role === "admin"
//         });

//     } catch (error) {
//         console.log(error);
//         res.json({ success: false, message: error.message });
//     }
// };

//API to get dashboard data

export const getDashboardData = async(req, res)=>{
    try {
        const bookings = await Booking.find({isPaid: true})
        const activeShows = await Show.find({showDateTime: {$gte: new Date()}}).
        populate('movie');


        const totalUser = await User.countDocuments();

        const dashboardData = {
            totalBookings: bookings.length,
            totalRevenue : bookings.reduce((acc, booking)=> acc + booking.amount,0),
            activeShows,
            totalUser
        }

        res.json({success:true, dashboardData})
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
    }
}

//APi to get all shows
export const getALlShows = async(req,res)=>{
    try {
        const shows = await Show.find({showDateTime: { $gte: new Date()}}).
        populate('movie').sort({ showDataTime: 1})
        res.json({success: true, shows})

    } catch (error) {
        console.log(error);
         res.json({success:false, message: error.message})
    }
}

//API to get all bookings

export const getAllBookings = async(req,res)=>{
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: {path: "movie"}

        }).sort({createdAt: -1})
        res.json({success:true, bookings})
    } catch (error) {
        console.log(error);
         res.json({success:false, message: error.message})
    }
}