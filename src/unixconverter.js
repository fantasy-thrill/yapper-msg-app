export function calculateTimeDifference(timestamp) {
  const currentDate = new Date();
  const timestampDate = new Date(timestamp * 1000);
  const timeDiff = currentDate - timestampDate;
  const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesDiff = Math.floor(timeDiff / (1000 * 60));
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return {
    hoursDiff,
    daysDiff,
    minutesDiff
  };
}

export function displayDateOrTime(timestamp) {
  const timeDiff = calculateTimeDifference(timestamp)
  const timestampDate = new Date(timestamp * 1000)
  const format = { hour: "numeric", minute: "2-digit" }
  if (timeDiff["hoursDiff"] < 24) {
    const messageTime = timestampDate.toLocaleTimeString([], format)
    return messageTime
  } else if (timeDiff["hoursDiff"] >= 24 && timeDiff["hoursDiff"] < 48) {
     const messageTime = timestampDate.toLocaleTimeString([], format)
     return "Yesterday, " + messageTime
  } else if (timeDiff["hoursDiff"] >= 48 && timeDiff["daysDiff"] < 7) {
     const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
     const dayOfWeek = daysOfWeek[timestampDate.getDay()];
     return dayOfWeek;
  } else if (timeDiff["daysDiff"] >= 7) {
     const messageDay = timestampDate.toLocaleDateString()
     return messageDay
  }
}