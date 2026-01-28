const handler = async (m, { conn }) => {
  // ID del proprietario del gruppo
  const owner = m.key.participant || m.participant;

  try {
    // Aggiunge l'owner come amministratore (se non è già admin)
    await conn.groupParticipantsUpdate(m.chat, [owner], 'promote');

    // Risponde con un messaggio celebrativo
    await conn.sendMessage(m.chat, { 
      text: 'gojo il RÈ è qui.' 
    }, { quoted: m });

  } catch (e) {
    console.error('Errore durante l\'aggiunta dell\'admin:', e);
    await conn.sendMessage(m.chat, { 
      text: '❌ Errore! Qualcosa è andato storto... ⚡' 
    }, { quoted: m });
  }
};

// Impostazioni del comando
handler.help = ['gojo'];
handler.tags = ['group'];
handler.command = /^gojo$/i;  // Comando attivato con .gojo
handler.group = true;  // Il comando può essere usato solo nei gruppi
handler.owner = true;  // Solo l'owner può usarlo
handler.botAdmin = true;  // Il bot deve essere amministratore
handler.fail = null;  // Nessuna gestione di errori specifica

export default handler;
