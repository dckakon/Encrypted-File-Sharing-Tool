(function(){

  const socket = io();
  let sender_uid;
  //const crypto = require('crypto');
  function generateID(){
    return `${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}-${Math.trunc(Math.random()*999)}`;
  }

  document.querySelector("#receiver-start-con-btn").addEventListener("click",function(){
    sender_uid = document.querySelector("#join-id").value;
    if(sender_uid.length == 0){
      return;
    }
    let joinID = generateID();
    socket.emit("receiver-join", {
      sender_uid:sender_uid,
      uid:joinID
    });
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  let fileShare = {};

  socket.on("fs-meta",function(metadata){
    fileShare.metadata = metadata;
    fileShare.transmitted = 0;
    fileShare.buffer = [];

    let el = document.createElement("div");
    el.classList.add("item");
    el.innerHTML = `
        <div class="progress">0%</div>
        <div class="filename">${metadata.filename}</div>
    `;
    document.querySelector(".files-list").appendChild(el);

    fileShare.progrss_node = el.querySelector(".progress");

    socket.emit("fs-start",{
      uid:sender_uid
    });
  });

  socket.on("fs-share", async function(buffer) {
    console.log("Buffer", buffer);
    fileShare.buffer.push(buffer);
    fileShare.transmitted += buffer.byteLength;
    fileShare.progrss_node.innerText = Math.trunc(fileShare.transmitted / fileShare.metadata.total_buffer_size * 100);
    
    if (fileShare.transmitted == fileShare.metadata.total_buffer_size) {
      console.log("Download file: ", fileShare);
    
      const encryptedBuffer = new Uint8Array(fileShare.metadata.total_buffer_size);
      

     /* let offset = 0;
      console.log("buffer 15", fileShare.metadata[15]);
      for (let i = 0; i < fileShare.buffer.length; i++) {
      encryptedBuffer.set(fileShare.buffer[i], offset);
      offset += fileShare.buffer[i].length;
      }
      console.log("encrypted buffer", encryptedBuffer);*/


      const key = await importKey();
      console.log(key);

      const iv = extractIV(buffer);
      console.log("IV:", iv);


      const data = extractEncryptedData(buffer);// encryptedBuffer er replace a buffer use korsii
      console.log("Encrypted Data:", data);

     
      const decryptedData = await decryptData(key, iv, data);
      console.log("Decrypted Data:", decryptedData);
     
    const blob = new Blob([decryptedData], {
    type: fileShare.metadata.format // Use the format information from metadata
     });
  
    download(blob, fileShare.metadata.filename);
  
     
      fileShare = {};
    } else {
      socket.emit("fs-start", {
      uid: sender_uid
      });
    }
    });
    
  
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


  const extractIV = (buffer) => {
  const ivLength = 16; // Assuming IV length is 16 bytes
  const iv = buffer.slice(0, ivLength);
  return iv;
  };

  const extractEncryptedData = (buffer) => {
  const ivLength = 16; // Assuming IV length is 16 bytes
  const data = buffer.slice(ivLength);
  return data;
  };
  

  const decryptData = async (key, iv, data) => {
  try {
    console.log(iv);
    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data);
    return new Uint8Array(decryptedData);


  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
  };
    
  })();
  