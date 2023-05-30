const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, createAudioResource, NoSubscriberBehavior, createAudioPlayer } = require('@discordjs/voice');
const ytdl = require('ytdl-core-discord');



const client = new Client({
    intents:[
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
});

const settings = {
   prefix: 't!',
   token: 'BOT-TOKEN'
};

const queue = new Map();

client.on('ready', () => {
  console.log('${client.user.tag} je online :D');
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(settings.prefix)) return;

  // PING

  if(message.content.startsWith(settings.prefix + "ping")) {
    message.reply({ content: "Pong!" });
    return;
  };  

  // MUSIC BOT

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(settings.prefix + "play")){
    execute(message, serverQueue).catch(console.error);
    return;
  } else if (message.content.startsWith(settings.prefix + "skip")){
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(settings.prefix + "stop")){
    stop(message, serverQueue);
    return;
  } else {
    message.channel.send("Krivi unos brate!");
  }

  async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const voiceChannel = message.member?.voice.channel;
  
    if (!voiceChannel)
      return message.channel.send("Nema nikog u voice channelu!");
  
    const permissions = voiceChannel.permissionsFor(message.client.user);

    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send("Brate daj dopustenje");
    }
  
    try {
      const songInfo = await ytdl.getInfo(args[1]);
  
      const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      };
  
      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
        };
    
        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);
    
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
    
        queueContruct.connection = connection;
    
        play(message.guild, queueContruct.songs[0]);
      } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} je dodana u listu cekanja!`);
      }

    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send("Error: " + err.message);
    }
  }

  async function play(guild, song) {
    const serverQueue = queue.get(guild.id);
  
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }
  
    try {
      const resource = createAudioResource(await ytdl(song.url), {
        inlineVolume: true,
      });
  
      resource.volume.setVolumeLogarithmic(serverQueue.volume / 5);
  
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
  
      player.play(resource);
  
      serverQueue.connection.subscribe(player);
      serverQueue.textChannel.send(`Trenutno svira ${song.title}`);
    } catch (error) {
      console.error(error);
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      serverQueue.textChannel.send("Dogodila se pogreška prilikom reproduciranja pjesme.");
    }
  }  

  function skip(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send("Moraš biti u voice channelu za stopiranje glazbe");
  
    if (!serverQueue)
      return message.channel.send("Trenutno nema pjesme da priskočim");
  
    if (serverQueue.connection.dispatcher)
      serverQueue.connection.dispatcher.end();
  }
  

  function stop(message, serverQueue) {
    if (!message.member.voice.channel)
      return message.channel.send("Moraš biti u voice channelu za stopiranje glazbe");
  
    if (!serverQueue || !serverQueue.connection)
      return message.channel.send("Trenutno nema pjesme da zaustavim");
  
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }

});

client.login(settings.token);
