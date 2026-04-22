import { isSameDay } from 'date-fns';

try {
  const schStart = new Date("09:00:00");
  console.log("Parsed:", schStart);
  console.log(isSameDay(schStart, new Date()));
} catch (e) {
  console.log("Error:", e.message);
}