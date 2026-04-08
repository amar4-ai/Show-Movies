import { clerkClient } from "@clerk/express";

export const protectAdmin = async(req,res,next)=>{
    try {
        const {userId} = req.auth();

        const user = await clerkClient.users.getUser(userId)

        if(user.privateMetadata.role !== 'admin'){
            return res.json({success:false, message:"not authorized"});
        }
        next();
    } catch (error) {
        console.log(error);
         return res.json({success:false, message:"not authorized"});
    }
}

// import { clerkClient, getAuth } from "@clerk/express";

// export const protectAdmin = async (req, res, next) => {
//     try {
//         const { userId } = getAuth(req);

//         console.log("USER ID:", userId);

//         if (!userId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Not logged in"
//             });
//         }

//         const user = await clerkClient.users.getUser(userId);

//         console.log("USER METADATA:", user.privateMetadata);

//         if (user?.privateMetadata?.role !== "admin") {
//             return res.status(403).json({
//                 success: false,
//                 message: "not authorized"
//             });
//         }

//         next();

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };