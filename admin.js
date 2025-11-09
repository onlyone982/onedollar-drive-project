// 관리자용 후원 등록 함수
async function addDonationRecord(name, amount) {
  try {
    await addDoc(collection(db, "donations"), {
      name: name,
      amount: amount,
      date: new Date()
    });
    alert("후원 내역이 등록되었습니다.");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// 예시: 후원 버튼 클릭 시 입력
document.querySelector("#adminSubmitBtn").addEventListener("click", () => {
  const name = document.querySelector("#donorName").value;
  const amount = parseFloat(document.querySelector("#donationAmount").value);
  addDonationRecord(name, amount);
});
