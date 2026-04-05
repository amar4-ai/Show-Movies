export const dateFormat = (date) =>{
    return new Date(date).toLocaleString('en-Us', {
        weekday:'short',
        month:'long',
        day:'numeric',
        hour:'numeric',
        minute:'numeric'
    })
}
