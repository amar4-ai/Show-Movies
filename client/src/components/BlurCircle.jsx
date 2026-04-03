const BlurCircle = ({top = "auto", left = "auto", right = "auto", bottom = "auto", color = "bg-red-500/30"}) => {
  return (
    <div 
      className={`absolute -z-50 h-56 w-56 aspect-square rounded-full blur-3xl ${color}`}
      style={{ top, left, right, bottom }}
    >
    </div>
  )
}

export default BlurCircle