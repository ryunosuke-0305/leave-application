// 曜日を日本語で返す
function getDayOfWeek(date) {
  const week = ["日", "月", "火", "水", "木", "金", "土"];
  return week[date.getDay()];
}