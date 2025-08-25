document.getElementById('sendToKindleForm').addEventListener('submit', function (e) {
	e.preventDefault();

	const url = document.getElementById('url').value;
	const kindleEmail = document.getElementById('kindle-email').value;
	const messageDiv = document.getElementById('message');
	const messageText = document.getElementById('messageText');
	const submitButton = document.querySelector('.glass-button');

	messageDiv.className = 'message processing';
	messageDiv.classList.remove('hidden');
	messageText.textContent = 'Processing your request...';
	submitButton.classList.add('loading');
	submitButton.disabled = true;

	(async function () {
		try {
			const response = await fetch('/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, email: kindleEmail }),
			});

			if (response.status === 200) {
				messageDiv.className = 'message success';
				messageText.textContent = 'Article sent successfully to your Kindle! 📚';
			} else {
				throw new Error('Failed to send article to Kindle');
			}
		} catch (error) {
			messageDiv.className = 'message error';
			messageText.textContent = 'Unable to send article. Please try again.';
		}

		submitButton.classList.remove('loading');
		submitButton.disabled = false;

		setTimeout(() => {
			messageDiv.classList.add('hidden');
		}, 8000);
	})();
});

// Parallax effect for orbs
document.addEventListener('mousemove', (e) => {
	const orbs = document.querySelectorAll('.orb');
	const x = e.clientX / window.innerWidth;
	const y = e.clientY / window.innerHeight;

	orbs.forEach((orb, index) => {
		const speed = (index + 1) * 10;
		const xOffset = (x - 0.5) * speed;
		const yOffset = (y - 0.5) * speed;
		orb.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
	});
});


