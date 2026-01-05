let quarter = 0;

const logEl = document.getElementById("log");
const btn = document.getElementById("nextBtn");

btn.addEventListener("click", () => {
  quarter += 1;
  logEl.textContent = `第 ${quarter} 个季度过去了。\n你仍在江湖之中。`;
}); 