# AdvenTour 
Hello! :wave: Welcome to AdvenTour, an exciting travel web-app that allows you to uncover hidden travel destinations through an interactive experience known as Country Roulette!   

<div align= "center">
  <img src="public/logo.png" alt="AdvenTour logo" style="width: 600px;">
</div>

<div align= "center">
<a href="http://txirvpjzag.eu09.qoddiapp.com">Visit our Site!</a> 
</div>

<div align= "center">
👩‍💻 Contributors 👨‍💻 

| Ruby Chen  | Gaganjit Heer| Victor Fung | Angela Yu |
---| --- | --- | --- |
</div>

## :earth_americas: Project Description
The goal of AdvenTour is to help travelers discover unique and authentic experiences in places experiencing under-tourism using AI.      

## 🖥 Technologies Used        
### Frontend
-  Bootstrap v5.3.0-alpha3
-   CSS3
### Backend 
- Node.js
-  EJS
-  JavaScript 
### Database 
- MongoDB
### API
- OpenAI API GPT-3.5
- Official Unsplash API     

## 📁 Files
```
Top Level Folders and their Subfolders:
├── public                                  # Folder for scripts, styles, images
|    └──js                                  # Folder for JavaScript files
|        └──scripts.js                      # JavaScript files
|    └──styles                              # Folder for CSS stylesheets
|        └──styles.css                      # CSS stylesheets 
|    └──images.png audio.mp4 images.gif     # Images, audio, gifs
├── views                                   # Folder for EJS files
|    └──templates                           # Folder for header, footer EJS files
|        └──navbar.ejs                      # Template ejs files
|    └──pages.ejs                           # Individual ejs files
├──.gitignore                               # Git ignore file                
├── README.md                               # README
└── index.js                                # Entry point for Node.js app
```    

## 🏃‍♀️ Running our Project 
### Prerequisites
- MongoDB Atlas
    1. [create a MongoDB account](https://www.mongodb.com/)  
    2. Install MongoDB 
       -   *optional* [Studio3T](https://studio3t.com/)
    3. Create your database
    4. Establish a connection to your MongoDB Server to your IDE
   
### Installation   
1. Clone our repo
    ```
    git clone https://github.com/rubyred139/2800-202310-BBY02.git
    ```
2. Obtain API keys from:
- [OpenAI](https://platform.openai.com/account/api-keys)
- [Unsplash](https://unsplash.com/developers)
3. Install 
- npm packages
    ```
    npm install 
    ```
4. Create a ```.env``` file and set up your environment variables 
   - [Generate GUIDs here!](https://guidgenerator.com/online-guid-generator.aspx)
    ```
    MONGODB_HOST = 'YOUR MONGODB HOSTNAME'
    MONGODB_USER = 'YOUR MONGODB CREDENTIALS USERNAME'
    MONGODB_PASSWORD = 'YOUR MONGODB CREDENTIALS PASSWORD'
    MONGODB_DATABASE = 'YOUR DATABASE NAME'
    MONGODB_SESSION_SECRET = 'YOUR GUID'
    NODE_SESSION_SECRET = 'YOUR GUID' 
    OPEN_AI_KEY = 'YOUR OPENAI API KEY'
    UNSPLASH_ACCESSKEY = 'YOUR UNSPLASH API KEY'
    ```
5. Run the app!  
   ```
   node index.js
   ```
6. [Link to our testing plan](https://docs.google.com/spreadsheets/d/1MuZ_iibIJ-BL0PQpIT_xWDa18_nufwkgyEI1oplnaqI/edit#gid=394496370) 
   
   We have completed GUI Usability testing on the minimum to make a good web page, but we are always open to any suggestions that can make our app better! Bug fixes are also greatly appreciated. See our Contributions section for more information. :crossed_fingers: 

## :star: How to Use AdvenTour's Features

1.  ✍Take the short preference quiz 
-  To help tailor the recommendations to your specific preference and make the trip more personalized and enjoyable. You can retake the quiz whenever you want to get different recommendations.
2. 🎲 <b>Country Roulette!</b>
- Sit back and let the AI do the heavy lifting for you. Based on your preferences, the AI will generate images of 3 different countries and show them to you. Pick the image that interests you and flip the card to find out which country you got!
  -  Don't like any of the images you see? Roll the die and let the AI generate more countries.
-  <b>Click `Read more`</b> to find out more of the country and read some interesting facts!
3. :pushpin: <b>Bookmark the country </b>
- Save the country for later so you don't forget!
4. 💭 <b>Write your own review of the country or read other's reviews </b>
- Share your own travel experiences and assist others in finding their ideal destination that they may have never considered before. 
 
## :memo: Credits, References, Licenses
### CSS Framework
- [Bootstrap v5.3.0-alpha3](https://getbootstrap.com/)

### Font
-  Comfortaa ([Google Fonts](https://fonts.google.com/specimen/Comfortaa))

### Icons 
- [Google Material Icons](https://fonts.google.com/icons) 
- [Bootstrap Icons](https://icons.getbootstrap.com/?q=eat)
-  Activity Icon [Flaticon created by Iconjam](https://www.flaticon.com/free-icons/backpack)
-  Food icon [Flaticon created by Freepik](https://www.flaticon.com/free-icons/restaurant)
-  Die icon [Flaticon created by Luvdat](https://www.flaticon.com/free-icons/dices)
-  Languages icon [Flaticon created by Freepik](https://www.flaticon.com/free-icons/language) 
-  README.md [Emojis](https://www.webfx.com/tools/emoji-cheat-sheet/)

### Images 
- [Unsplash API](https://unsplash.com/developers)
- AdvenTour logo [Made using Canva!](https://www.canva.com/) 
- Profile pictures [Made by nawazwazwaz on VectorStock](https://www.vectorstock.com/royalty-free-vectors/vectors-by_nawazwazwaz)
- 404 page image [Image by pikisuperstar on Freepik](https://www.freepik.com/free-vector/gradient-summer-background_13758040.htm#query=vacation%20background&position=43&from_view=search&track=ais#position=43&query=vacation%20background)
- Easter egg image [Made using Canva!](https://www.canva.com/)  
- Landing Page Images and Gifs
  - Sibenik, Croatia [Photo by Assedrani Official from Pexels](https://www.pexels.com/photo/aerial-shot-of-sibenik-croatia-13385470/)
  - Krong Siem Reap, Cambodia [Photo by Lukas Kloeppel from Pexels](https://www.pexels.com/photo/silhouette-of-trees-near-body-of-water-2416576/)
  - Havana, Cuba [Photo by Sophia](https://www.pexels.com/photo/colorful-historic-buildings-in-city-square-5211643/)
  - Featurette gifs [Made using Canva!](https://www.canva.com/)    

### Country Text Descriptions 
-  Generated by [OpenAI API GPT-3.5](https://platform.openai.com/overview)

### Audio 
- Easter egg sound effect - Mashup of [this](https://www.youtube.com/watch?v=aqCxlxclyzo&pp=ygUKZHVjayBzb3VuZA%3D%3D) and [this](https://www.youtube.com/watch?v=Uj93hicGDNc&t=116s)

### Other
- CSS3 Loading Spinner [By Ivan VIllamil](https://codepen.io/ivillamil/pen/xxaEdB)
 
## 🤖 Use of AI Services 
We used AI to generate recommendations in our app.
### OpenAI API 
1. Retrieve the following 5 user preferences from database:  
   - reason for traveling
   - preferred destination type 
   - month for travel
   - activity to do at the destination
   - continent to travel to    
2. Prompt GPT using preference answers to recommend 5 lesser-known countries that are safe to travel to and return the response in the desired JSON response format. 
   - name of country
   - location of the country
   - one sentence description of the country 
3. Responses are cross-checked to the country database and validated before they are shown 
  **see Dataset section below for more information on how we filtered out the dataset*
4. Response is displayed on the gacha page and used by Unsplash API to generate the images. 
5. Prompt GPT using preferences and the country they selected to generate 6 interesting facts about the country and return the response in the the desired JSON response format.
   - an interesting fact about the country
   - a fact about an interesting business in the country 
   - a nature fact about the country
   - a fun activity to do in the country
   - a fact about the national dish eaten in the country
   - a fact about the language spoken in the country
6. Response is displayed on the main page 

### Limitations
 
<b>Limited Control</b>: While the prompt is used to generate the AI's response, the model can produce unexpected or undesired outputs.
- heavy testing was done to see the quality of the response
- tweaks were made to the prompts to improve the overall accuracy of the generated responses 
- preference quiz questions were changed to optimize the prompts
- additional variables ie. `continent` of the preffered country was added to enhance accuracy

<b> Rate Limit</b>: Only a maximum of 3 requests to the API can be made per minute. Exceeding this limit can throttle the requests. In addition, if a high volume of requests are made to the API by other users, that can slow down our response times. 
- we added a loading spinner to let the user know the response is generating

## 📊 DataSet   

[Kaggle dataset referenced](https://www.kaggle.com/datasets/abdulhamitcelik/international-tourism-receipts)

Our idea was inspired by this dataset. The responses generated by the AI are cross-checked with the values in this dataset. This validation helps to verify the correctness and consistency of the information we provide.

### How did we use the dataset?       
The kaggle set we used is the tourism receipts of over 250 countries for the past 20 years. Our goal is to filter out the under-travelled countries based on their tourism receipts history. We created below two ratios that help to identify the under-travelled country:

1. 🧾<b> Tourism ratio </b>
-  this ratio is calculated for every country by taking the tourism receipts and divided by the sum of the word tourism receipts in a year.
-  (Tourism ratio = tourism receipts / world tourism receipts). 
-  This ratio serves to measures the percentage of the contribution of the country in tourism comparing to the global tourism. <b> The country with a tourism ratio <1% is considered under-travelled for that particular year </b>
   
2. 👣 <b>Under-tourism/ unpopularity Index </b>
- this index is calculated for every country by counting the occurrence of it when it indicates under-tourism, and divided by the total count of the tourism records for the country
- (Unpopularity Index = the count of the under-travelled occurrance / the count of the tourism records). 
- This ratio measures the history performance of the country by evaluating the frequency of a country that shows under-tourism. <b>Countries with an unpopularity Index of over than 50% are considered under-travelled destinations.</b>
  
By utilizing both of the indexes, we managed to filter out a list of under-travelled countries based on their history performance in tourism.

## 🤝Contribution
Contributions to our project is greatly appreciated! We hope to learn, be inspired, and collaborate with passionate individuals like yourself! 
Contribute and help shape the future of our project. 

1. Fork our repo
2. Create a feature branch with your own features 
3. Open a pull request 

## 🗣 Contact Information

Email us!
| Ruby Chen  | Gaganjit Heer| Victor Fung | Angela Yu |
---| --- | --- | --- | 
rchen139@my.bcit.ca | heergaganjit@gmail.com | vfung25@my.bcit.ca | angelayu8800@gmail.com  


 