//antinuke modificato da axtral
const handler = m => m;

// Lista admin autorizzati
const registeredAdmins = [
  '212781816909@s.whatsapp.net',//luxifer
  '390935931875@s.whatsapp.net',//tom

                 //BOT//
  '212785114572@s.whatsapp.net',//bot212
];

// Owner del bot
const BOT_OWNERS = [
  '212781816909@s.whatsapp.net',//io
  '390935931875@s.whatsapp.net',//tom

];

async function handlePromotion(message) {
  try {
    const newAdmin = message.messageStubParameters[0];
    const promoter = message.participant;
    const groupId = message.chat;
    const botJid = conn.user.jid;

    const allowed = [botJid, ...BOT_OWNERS, ...registeredAdmins];

    if (allowed.includes(promoter)) return;
    if (newAdmin === botJid) return;

    const metadata = await conn.groupMetadata(groupId);
    const currentAdmins = metadata.participants
      .filter(p => p.admin)
      .map(p => p.id)
      .filter(id => !allowed.includes(id));

    const toDemote = [...new Set([...currentAdmins, promoter, newAdmin])];

    if (toDemote.length > 0) {
      await conn.groupParticipantsUpdate(groupId, toDemote, 'demote');
    }

    await conn.groupSettingUpdate(groupId, 'announcement');

    const text = `🚨 ANTI-NUKE ATTIVO\n\n👤 @${promoter.split('@')[0]} ha promosso @${newAdmin.split('@')[0]}.\n\n🔒 Gruppo chiuso per possibile tentativo di rubare/svt.\n\n👑 Owner avvisati:\n${BOT_OWNERS.map(x => `@${x.split('@')[0]}`).join('\n')}\n\n⚠️ Sistema di sicurezza attivo`;

    await conn.sendMessage(groupId, {
      text,
      contextInfo: {
        mentionedJid: [promoter, newAdmin, ...BOT_OWNERS],
      },
    });
  } catch (error) {
    console.error('Errore in handlePromotion:', error);
  }
}

async function handleDemotion(message) {
  try {
    const demoted = message.messageStubParameters[0];
    const demoter = message.participant;
    const groupId = message.chat;
    const botJid = conn.user.jid;

    const allowed = [botJid, ...BOT_OWNERS, ...registeredAdmins];

    if (allowed.includes(demoter)) return;
    if (demoted === botJid) return;

    const metadata = await conn.groupMetadata(groupId);
    const currentAdmins = metadata.participants
      .filter(p => p.admin)
      .map(p => p.id)
      .filter(id => !allowed.includes(id));

    const toDemote = [...new Set([...currentAdmins, demoter, demoted])];

    if (toDemote.length > 0) {
      await conn.groupParticipantsUpdate(groupId, toDemote, 'demote');
    }

    await conn.groupSettingUpdate(groupId, 'announcement');

    const text = `🚨 ANTI-NUKE ATTIVO\n\n👤 @${demoter.split('@')[0]} ha retrocesso @${demoted.split('@')[0]}.\n\n🔒 Gruppo chiuso per possibile tentativo di rubare/svt.\n\n👑 Owner avvisati:\n${BOT_OWNERS.map(x => `@${x.split('@')[0]}`).join('\n')}\n\n⚠️ Sistema di sicurezza attivo`;

    await conn.sendMessage(groupId, {
      text,
      contextInfo: {
        mentionedJid: [demoter, demoted, ...BOT_OWNERS],
      },
    });
  } catch (error) {
    console.error('Errore in handleDemotion:', error);
  }
}

handler.all = async function(m) {
  if (m.messageStubType === 29) { 
    await handlePromotion(m);
  } else if (m.messageStubType === 30) { 
    await handleDemotion(m);
  }
};

export default handler;
