(function () {
	let receiverID;
	//const encryptedFile = 'en_file.txt';
	//crypto = require('crypto');
	const hexStringToUint8Array = (hexString) => {
		const arrayBuffer = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
		return new Uint8Array(arrayBuffer);
	};

	const stringToUint8Array = (str) => {
		return new TextEncoder().encode(str);
	};

	const importKey = async () => {
		const keyData = stringToUint8Array('MySuperSecretKey'.padEnd(32, '\0'));
		return await crypto.subtle.importKey('raw', keyData, 'AES-CBC', false, ['encrypt', 'decrypt']);
	};

	const encrypt = async (key, buffer) => {
		const iv = crypto.getRandomValues(new Uint8Array(16));
        const encryptedData = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, buffer);
        const encryptedBuffer = new Uint8Array(encryptedData);

		// Prepend the IV to the encrypted data
		const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.length);
		combinedBuffer.set(iv);
		combinedBuffer.set(encryptedBuffer, iv.length);
		
		return combinedBuffer;
	};

	const socket = io();

	function generateID() {
		return `${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}-${Math.trunc(Math.random() * 999)}`;
	}

	document.querySelector("#sender-start-con-btn").addEventListener("click", function () {
		let joinID = generateID();
		document.querySelector("#join-id").innerHTML = `
			<b>Room ID</b>
			<span>${joinID}</span>
		`;
		socket.emit("sender-join", {
			uid: joinID
		});
	});

	socket.on("init", function (uid) {
		receiverID = uid;
		document.querySelector(".join-screen").classList.remove("active");
		document.querySelector(".fs-screen").classList.add("active");
	});

	document.querySelector("#file-input").addEventListener("change", async function (e) {
		let file = e.target.files[0];
		if (!file) {
			return;
		}
		let reader = new FileReader();
		reader.onload = async function (e) {
			let buffer = new Uint8Array(reader.result);

			const key = await importKey();
			const encryptedBuffer = await encrypt(key, buffer);
			console.log(encryptedBuffer);
			console.log("key:",key);
			let el = document.createElement("div");
			el.classList.add("item");
			el.innerHTML = `
				<div class="progress">0%</div>
				<div class="filename">${file.name}</div>
			`;
			document.querySelector(".files-list").appendChild(el);
			shareFile({
				filename: file.name,
				total_buffer_size: encryptedBuffer.length,
				buffer_size: 1024,
			}, encryptedBuffer, el.querySelector(".progress"));
		};
		reader.readAsArrayBuffer(file);
	});

	function shareFile(metadata, buffer, progress_node) {
		socket.emit("file-meta", {
			uid: receiverID,
			metadata: metadata
		});

		socket.on("fs-share", function () {
			let chunk = buffer.slice(0, metadata.buffer_size);
			buffer = buffer.slice(metadata.buffer_size, buffer.length);
			progress_node.innerText = Math.trunc(((metadata.total_buffer_size - buffer.length) / metadata.total_buffer_size * 100)) + "%";
			if (chunk.length != 0) {
				socket.emit("file-raw", {
					uid: receiverID,
					buffer: chunk
				});
			} else {
				console.log("Sent file successfully");
				// File transmission complete
				// Add any desired functionality here
			}
		});
	}
})();
