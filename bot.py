import discord
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Set up the credentials for the Google Sheets API
creds = service_account.Credentials.from_service_account_file('googlecloudservicecreditionals.json')
service = build('sheets', 'v4', credentials=creds)

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

# Set up the Discord client with the intents parameter
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print('Logged in as {0.user}'.format(client))

@client.event
async def on_message(message):
    if message.content.startswith('!rating'):
        # Parse the user's name from the message content
        parts = message.content.split(' ')
        if len(parts) > 1:
            user_mention = parts[1]
            user_id = user_mention[2:-1]
            user = message.guild.get_member(int(user_id))  # Get the member object from the user id
            name = user.display_name if user else None  # Use the display name if the member object is found, otherwise use None
            print(f"User's name: {name}")
        else:
            user_id = str(message.author.id)
            user_mention = f"<@{user_id}>"
            name = message.author.display_name
            print(f"Using message author's name: {name}")

        avatar_url = message.author.avatar.url

        # Get the values from column A and B of the sheet starting from row 2
        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId='1KmX3jXtWeAvGHexA3k5ev2vrouBsI3GZEuh_YqAJapY',
                                    range='ranking!B2:C').execute()
        values = result.get('values', [])

        # Search for the user's mention in column C and get the corresponding value in column B
        for index, row in enumerate(values):
            if len(row) > 1 and user_mention in row[1]:
                rating = row[0]
                rank = index + 1  # Calculate the rank based on the index (already starting from row 2)

                # Create an embed with the user's profile picture, rating, and rank
                embed = discord.Embed(title=f"{name}'s Rating and Rank", description=f"Rating: {rating}\nRank: {rank}",
                                      color=0x3498db)
                embed.set_thumbnail(url=avatar_url)
                await message.channel.send(embed=embed)
                break
        else:
            await message.channel.send(f"Could not find {name}'s rating.")

# Add any other message handling code here

# Replace 'your_bot_token' with the token of your Discord bot
client.run('botdiscordtoken')
