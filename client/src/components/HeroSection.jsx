import React from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
    const navigate = useNavigate();
    return (
        <div className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen'
            style={{ backgroundImage: "url('/backgroundImage.png')" }}>

            <img src={assets.marvelLogo} className='max-h-11 lg:h-11 mt-20' alt="Marvel Logo" />

            <h1 className='text-5xl md:text-7xl md:leading-tight font-semibold text-center'>
                Guardians <br /> of the Galaxy
            </h1>

            <div className="flex items-center gap-4 text-gray-300">
                <span>Action | Adventure | Sci-Fi</span>
                <div className="flex items-center gap-1">
                    <Calendar className='w-4 h-4' />
                    <span>2018</span>
                </div>
                
                <div className="flex items-center gap-1">
                    <Clock className='w-4 h-4' />
                    <span>2h 8m</span>
                </div>
            </div>
            <p className="max-w-md text-gray-300">In a post-apocalytic world where cities ride on wheels and consume each other to survive , two people meet in London and try to stop a consiparcy.</p>
            <button onClick={()=> navigate('/movies')} className='flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'>
                Expolre Movies <ArrowRight className='w-5 h-5' />
               
            </button>
        </div>
    )
}

export default HeroSection