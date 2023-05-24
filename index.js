require("./utils.js");

require("dotenv").config();
// const url = require("url");
const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);
const nodemailer = require('nodemailer');
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
// const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const path = require('path');
const saltRounds = 12;

const app = express();

app.use(express.json());

const Joi = require("joi");
// const { count } = require("console");

const port = process.env.PORT || 2000;

const expireTime = 2 * 60 * 60 * 1000; //expires after 2 hr (minutes * seconds * millis)

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var { database } = include("databaseConnection");

const userCollection = database.db(mongodb_database).collection("users");
const untrvl_countries = database
  .db(mongodb_database)
  .collection("under-travelled_countries");
const reviewsCollection = database.db(mongodb_database).collection('reviews');

var { database } = include("databaseConnection");

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}
function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next();
  } else {
    res.redirect("/");
  }
}

app.get("/", (req, res) => {
  res.render("landing");
});

app.get('/easterEgg', (req, res) => {
  res.render("easterEgg")
})

app.get('/nosql-injection', async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(
      `<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
    );
    return;
  }
  console.log("user: " + username);

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send(
      "<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>"
    );
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();

  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
});

app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: "" });
});

app.post("/signupSubmit", async (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  var securityAnswer = req.body.securityAnswer;

  const schema = Joi.object({
    username: Joi.string().alphanum().max(20).required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    securityAnswer: Joi.string().required(),
  });

  const validationResult = schema.validate({
    username,
    password,
    email,
    securityAnswer,
  });

  if (validationResult.error != null) {
    const errorMessage = validationResult.error.message;
    //look at terminal to see error message
    console.log(validationResult.error);

    if (errorMessage.includes('"username"')) {
      const errorMessage = "Name is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"email"')) {
      const errorMessage = "Email is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"password"')) {
      const errorMessage = "Password is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes('"securityAnswer"')) {
      // added
      const errorMessage = "Security answer is required."; // added
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  } else {
    // check if user with the same email already exists
    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) {
      // email already taken, handle accordingly
      const errorMessage = "Email already in use.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  }

  var hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
    securityAnswer: securityAnswer,
    profilePicture: "profilepic3.png",
    emailNotifications: true, // Default value for email notification preference
  });
  console.log("Inserted user");

  //create a session and redirect to main page
  req.session.user = {
    username: username,
    email: email,
  };

  //sets authentication to true
  req.session.authenticated = true;

  //sets their username
  req.session.username = username;

  //sets user's id in the user session
  req.session._id = result.insertedId;

  res.redirect("/quizWelcome");
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", successMessage: "" });
});

app.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  const schema = Joi.string().required();
  const validationResult = schema.validate(email, password);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    const errorMessage = "User not found.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }

  const result = await userCollection
    .find({ email: email })
    .project({ email: 1, password: 1, username: 1, _id: 1 })
    .toArray();

  console.log(result);

  if (result.length != 1) {
    console.log("user not found");
    const errorMessage = "User not found.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = result[0].username;
    req.session._id = result[0]._id;
    req.session.cookie.maxAge = expireTime;

    res.redirect("/gachaLoading");
    return;
  } else {
    console.log("incorrect password");
    const errorMessage = "Invalid email/password combination.";
    res.render("login", { errorMessage: errorMessage, successMessage: "" });
    return;
  }
});

app.get("/changePassword", (req, res) => {
  res.render("changePassword", { errorMessage: "" });
});

app.post("/changePassword", async (req, res) => {
  const existingEmail = req.body.email;
  const securityAnswer = req.body.securityAnswer;

  const existingUser = await userCollection.findOne({
    email: existingEmail,
    securityAnswer: securityAnswer,
  });

  if (!existingUser) {
    console.log("invalid combination");
    const errorMessage = "Incorrect answer to the security question.";
    res.render("changePassword", { errorMessage: errorMessage });
    return;
  }

  console.log("both inputs correct");

  // Save email in session
  req.session.email = existingEmail;

  res.redirect("/resetPassword");
});

app.get("/resetPassword", (req, res) => {
  const email = req.session.email;
  res.render("resetPassword", { errorMessage: "", email: email });
});

app.post("/resetPassword", async (req, res) => {
  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const email = req.session.email;

  if (newPassword !== confirmPassword) {
    const errorMessage = "Passwords do not match";
    res.render("resetPassword", { errorMessage: errorMessage, email: email });
    return;
  } else {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await userCollection.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    res.render("login", {
      successMessage:
        "Your password has been changed successfully. Please log in again.",
      errorMessage: "",
    });
    console.log("password is changed for user with this email: ", email);
  }
});

app.get("/quizWelcome", (req, res) => {
  res.render("quizWelcome", { name: req.session.username });
});

app.get("/quiz", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/");
  } else {
    var name = req.session.name;
    var userId = req.session._id;
    res.render("quiz", { name, userId });
  }
});

app.post("/quiz", async (req, res) => {
  const db = database.db(mongodb_database);
  const userCollection = db.collection("users");

  const userId = req.session._id;
  const answers = {
    question1: req.body.question1,
    question2: req.body.question2,
    question3: req.body.question3,
    question4: req.body.question4,
    question5: req.body.question5
  };

  try {
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { quizAnswers: answers } }
    );
    console.log("Answers saved to database");
    res.redirect("/gachaLoading");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving quiz answers to database");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  console.log("user logged out");
  res.redirect("/");
});

// Isolate keywords from chatGPT response and uses them to search for and return related images
async function getFactImages(place) {
  const factImageUrls = [];
  for (const x in place) {
    var testFact = place[x];
    console.log(testFact);

    try {
      const requestURL = `https://api.unsplash.com/search/photos?query=${testFact}&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
      const response = await fetch(requestURL);
      const responseBody = await response.json();
      var imageURL = responseBody.results[0].urls.regular;
      factImageUrls.push(imageURL);

      // If no images available from search, a default picture will be used instead
    } catch (err) {
      console.log(err);
      const defaultURL = `https://api.unsplash.com/search/photos?query=continental-breakfast&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
      const response = await fetch(defaultURL);
      const responseBody = await response.json();
      var imageURL = responseBody.results[0].urls.regular;
      factImageUrls.push(imageURL);
    }
  }

  return factImageUrls;
}

// Generates a response from chatGPT, then answers are parsed and stored in mongoDB database
app.post("/main/:countryName", sessionValidation, async (req, res) => {
  try {
    const username = req.session.username;
    console.log(username);
    req.session.countryName = req.params.countryName;
    var currentCountry = req.session.countryName;
    console.log(currentCountry);

    const result = await userCollection
      .find({ username: username })
      .project({ quizAnswers: 1 })
      .toArray();

    const userId = req.session._id;
    const userEntry = result[0];
    const answers = userEntry.quizAnswers;

    // Prompt for chatGPT using quiz answers and selected country
    const countryResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
        A new traveller is going to ${req.session.countryName}. The purpose of their trip is for ${answers.question1}. They are going in ${answers.question3}. 
          
        They would prefer to travel to a ${answers.question2} environment and their preferred activities are to ${answers.question4}.

        Based on this information for this country, provide one quirky fun fact that the traveller would enjoy, one recommended local business, 
        and one natural destination they would like, a recommend activity to do here, a fact about the national dish of the country, and 
        a fact about what is the official language. Each fact should be descriptive.

        Return the response in the following parsable JSON format:

        [
          {
            "quirkyFact" : "the quirky fact",
            "businessFact" : "the business fact",
            "natureFact" : "the natural destination fact",
            "activityFact" : "the activity fact",
            "dishFact" : "the national dish fact",
            "languageFact" : "the popular times fact"
          },
          {
            "quirkyFactTitle" : "country name from quirkyFact",
            "businessFactTitle" : "business name from businessFact, country name",
            "natureFactTitle" : "natural destination name from natureFact, country name",
            "activityFactTitle" : "activity from activityFact or if activity is at a location, then the location name",
            "dishFactTitle" : "dish name from dishFact",
            "languageFactTitle" : "the language, and the word language"
          }
        ]
      `,
      max_tokens: 2000,
      temperature: 0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    // ChatGPT response is retrieved 
    const apiResponse = countryResponse.data;
    const completion = apiResponse.choices[0].text;

    // Response is trimmed in cases where String "Answer: " or "Reponse: " is added to response by chatGPT
    var trimmedCompletion = completion.trimStart();
    if (trimmedCompletion.startsWith("Answer:")) {
      trimmedCompletion = trimmedCompletion.replace("Answer:", "").trim();
    } else if (trimmedCompletion.startsWith("Response:")) {
      trimmedCompletion = trimmedCompletion.replace("Response:", "").trim();
    }

    // Trimmed response is seperated and seperated in mongoDB database
    const parsedResponse = JSON.parse(trimmedCompletion);
    const resultFacts = parsedResponse[0];
    const resultFactNames = parsedResponse[1];

    await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          promptAnswers: resultFacts,
          currentCountry: currentCountry,
          promptAnswerPlaces: resultFactNames,
        },
      }
    );

    res.redirect(`/mainLoading`);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});


// Notification
function sendEmail(username, useremail, country, date) {
  // Create a transporter object with your SMTP configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ZOHO_USER,
      pass: process.env.ZOHO_PSWD
    }
  });

  // Define the email options
  const mailOptions = {
    from: process.env.ZOHO_USER,
    to: useremail,
    subject: `Share your review of ${country} on AdvenTour`,
    html: `
    <p>Hi ${username},</p>

    <p>I hope you had a wonderful trip in ${country}! Share your experiences with us now! </p>
    <p><a href="http://txirvpjzag.eu09.qoddiapp.com/reviewForm">Click here to add your review</a></p>
    
    <p>AdvenTour</p>
    <img src="logo.png">
    `
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}
app.post("/markCountry", async(req, res) => {
  try {
    const userId = req.session._id;
    const result = await userCollection.findOne({ _id: new ObjectId(userId) });
    const markedCountries = result.markedCountry || []

    const markedCountry = req.body.mark
    const endDate = req.body.endDate

    // Add marked country
    let recordExists = false;
    if (markedCountries.length !==0) {
      for (let i=0; i<markedCountries.length; i++) {
        let record = markedCountries[i]
        if (record.countryName === markedCountry){
          recordExists = true;
          break;
        }
      }
    }

    if (recordExists) {
      await userCollection.replaceOne(
        { _id: new ObjectId(userId) },
        { $push: { markedCountry: { countryName: markedCountry, endDate: endDate }} }
      );
    } else {

      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { markedCountry: { countryName: markedCountry, endDate: endDate }} }
      );
      res.redirect("/bookmarks");
    }
  } catch (error) {
    console.error(error);
  }
})

app.get("/notification", async(req, res) =>{
  try {
    const userEmail = req.session.user.email
    const userName = req.session.user.username
    const userId = req.session._id;
    const result = await userCollection.findOne({ _id: new ObjectId(userId) });
    const emailNotification = result.emailNotifications
    const markedCountries = result.markedCountry

    // If user allows for email notification, loop through the array of the mark countries and send email
    if (emailNotification) {
      for (let i=0; i<markedCountries.length; i++) {
        const countryName = markedCountries[i].countryName
        const date = markedCountries[i].endDate
        sendEmail(userName, userEmail, countryName, date)
      }
    }

  } catch (error) {
    console.error(error);
  }
})

// Loading wheel for main page
app.get("/mainLoading", sessionValidation, (req, res) => {
  res.render("mainLoading");
});


// Main page of the app
app.get("/main", sessionValidation, async (req, res) => {
  try {
    const userId = req.session._id;

    const result = await userCollection.findOne({ _id: new ObjectId(userId) });

    const gachaCountry = result.currentCountry;

    const savedCountries = result.savedCountries || [];

    var isBookmarked = savedCountries.includes(gachaCountry) ? true : false;

    const facts = result.promptAnswers;

    if (facts.length === 0) {
      throw new Error("No facts available.");
    }

    const places = result.promptAnswerPlaces;
    var imagesList = await getFactImages(places);

    res.render("main", { facts: facts, gachaCountry, imagesList, isBookmarked });
  } catch (error) {
    console.error(error);
    res.redirect("/no-country");
  }
});


app.get("/no-country", sessionValidation, (req, res) => {
  res.render("no-country");
});

// Saves/deletes a country to/from the database when bookmark button is clicked
app.post("/bookmark", sessionValidation, async (req, res) => {
  try {
    const userId = req.session._id;

    const result = await userCollection.findOne({ _id: new ObjectId(userId) });

    const bookmarkedCountries = result.savedCountries || [];

    const gachaCountry = result.currentCountry;

    var isBookmarked;

    if (bookmarkedCountries.includes(gachaCountry)) {
      // Removes bookmark
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { savedCountries: gachaCountry } }
      );
      isBookmarked = false;
    } else {
      // Adds bookmark
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $push: { savedCountries: gachaCountry } }
      );
      isBookmarked = true;
    }

    req.session.isBookmarked = isBookmarked;


    res.redirect("/main");
  } catch (error) {
    console.error(error);
  }
});

// Bookmarks page of the app
app.get("/bookmarks", sessionValidation, async (req, res) => {
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });

  const gachaCountry = user.currentCountry;
  const savedCountries = user.savedCountries || [];
  var isBookmarked = savedCountries.includes(gachaCountry) ? true : false;

  var countryImages = await getFactImages(savedCountries);

  console.log(countryImages);

  res.render("bookmarks", { savedCountries, countryImages, isBookmarked });
});

// Removes bookmarks from the database when "remove" is pressed on bookmarks page
app.post("/removeBookmark", async (req, res) => {
  const userId = req.session._id;
  const removedCountry = req.body.remove;

  await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { savedCountries: removedCountry } }
  );

  res.redirect("/bookmarks");
})

app.get("/profile", async (req, res) => {
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  console.log(user);
  res.render("profile", { user });
});

app.post("/updateProfile", async (req, res) => {
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });

  const updatedFields = {
    username: req.body.username ? req.body.username : user.username,
    email: req.body.email ? req.body.email : user.email,
    password: req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password,
    securityAnswer: req.body.securityAnswer ? req.body.securityAnswer : user.securityAnswer,
    profilePicture: req.body.profilePicture ? path.basename(req.body.profilePicture) : user.profilePicture,
    emailNotifications: req.body.emailNotifications === 'on', // Convert checkbox value to boolean
  };  

  const nonNullFields = {};
  for (const [key, value] of Object.entries(updatedFields)) {
    if (value !== null) {
      nonNullFields[key] = value;
    }
  }

  await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: nonNullFields }
  );

  res.redirect("/profile");
});

async function getQuizAnswers(username) {
  const result = await userCollection
    .find({ username: username })
    .project({ quizAnswers: 1 })
    .toArray();
  console.log(result);
  const quizAnswers = result[0].quizAnswers;
  return quizAnswers;
}

async function countryGenerator(quizAnswers) {
  q1answer = quizAnswers.question1.toLowerCase();
  q2answer = quizAnswers.question2.toLowerCase();
  q3answer = quizAnswers.question3.toLowerCase();
  q4answer = quizAnswers.question4.toLowerCase();
  q5answer = quizAnswers.question5.toLowerCase();

  const prompt = `I am planning a ${q1answer} trip in January and looking for a country in ${q5answer} that offers ${q2answer}. I want to ${q4answer} during my travels. Can you recommend 5 lesser-known countries that are safe to travel on the ${q5answer} continent that meet these criteria? If there are fewer than 5 countries that meet the criteria, please provide any available options. If there is none, just return empty JSON.

  Return response in the following parsable JSON format only,     
    [{
        name: country that meets the above mentioned criteria,
        location: the location of the recommended country,,
        descr: one sentence description of the courtry
    }]    
  `;
  console.log(prompt)
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  const parsedResponse = JSON.parse(response.data.choices[0].message.content);
  return parsedResponse;
}

// Double confirm that the countries chagGPT provided is under-travelled by cross-checking the under-travelled countries collection in the database
async function checkCountries(countries) {
  let confirmedCountries = [];

  for (let i = 0; i < countries.length; i++) {
    const countryName = countries[i]["name"];
    try {
      const result = await untrvl_countries.findOne({ Country: countryName });
      if (result) {
        confirmedCountries.push(countries[i]);
      }
      if (countries.length >= 3) {
        // Slice the array to three if more than three countries pass the database verification
        function getRandom3Countries() {
          const shuffledArray = confirmedCountries.sort(() => Math.random() - 0.5);
          return shuffledArray.slice(0, 3);
        }
        getRandom3Countries();
        confirmedCountries = confirmedCountries.slice(0, 3)
      }
    } catch (err) {
      console.error("Error executing MongoDB query:", err);
    }
  }
  return confirmedCountries;
}

async function getImage(countries) {
  const imageURLs = [];
  for (let i = 0; i < countries.length; i++) {
    const countryName = countries[i].name;
    console.log(countryName);
    const requestURL = `https://api.unsplash.com/search/photos?query=${countryName}&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
    const response = await fetch(requestURL);

    const statusCode = response.status;
    console.log(statusCode);
    const responseBody = await response.json();
    const imageURL = responseBody.results[0].urls.regular;
    imageURLs.push(imageURL);
  }
  return imageURLs;
}

app.get("/gachaLoading", sessionValidation, (req, res) => {
  res.render("gachaLoading");
});
app.get("/gacha", sessionValidation, async (req, res) => {
  const name = req.session.username;
  const quizAnswers = await getQuizAnswers(req.session.username);
  const generatedCountries = await countryGenerator(quizAnswers);
  const confirmedCountries = await checkCountries(generatedCountries);
  let cardVisibility = "d-none";
  let flipVisibility = "d-block";
  if (confirmedCountries.length === 0) {
    cardVisibility = "d-block";
    flipVisibility = "d-none";
  }
  const imageURLs = await getImage(confirmedCountries);
  res.render("gacha", { name, confirmedCountries, quizAnswers, imageURLs, cardVisibility, flipVisibility })
});

app.get('/reviews', async (req, res) => {
  try {

    // Retrieve all reviews from the reviews collection
    const reviews = await reviewsCollection.find({}).toArray();
    console.log("Reviews:", reviews);

    // Retrieve the user's ID from the session
    const userId = req.session._id;

    // Retrieve the user's reviews from the reviews collection
    const myReviews = await reviewsCollection.find({ userId }).toArray();
    console.log("My Reviews:", myReviews);

    // Render the reviews page with the retrieved reviews and user's reviews
    res.render('reviews', { reviews, myReviews });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/reviewForm', (req, res) => {
  console.log(req.body);
  var userId = req.session._id;
  var name = req.session.username;
  res.render("reviewForm", { name, userId });
});

app.post('/reviewForm', async (req, res) => {
  // Get the user ID from the session
  const userId = req.session.user_id;

  // Create a review object with all form field values
  const review = {
    title: req.body.reviewTitle,
    country: req.body.countryName,
    visitTime: req.body.visitTime,
    tripLength: req.body.tripLength,
    vacationType: req.body.vacationType,
    experience: req.body.experience,
    userName: req.body.name,
    userId: req.body.userId
  };

  console.log(review);

  try {
    // Save the review to the database
    const result = await reviewsCollection.insertOne(review);
    console.log(`Saved review to database with ID: ${result.insertedId}`);

    // Redirect to the thank you page
    res.redirect('/thankyou');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving data to database');
  }
});

app.get("/thankyou", (req, res) => {
  res.render("thankyou");
})

// Delete Review Route
app.get('/deleteReview', async (req, res) => {
  const reviewId = req.query.id;

  try {
    // Delete the review from the database
    const result = await reviewsCollection.deleteOne({ _id: new ObjectId(reviewId) });
    console.log(`Deleted review from database with ID: ${reviewId}`);

    // Redirect to the reviews page
    res.redirect('/reviews');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting review from database');
  }
});

// Update Review Route (render the update form)
app.get('/updateReview', async (req, res) => {
  const reviewId = req.query.id;
  console.log("ID: ", reviewId);

  try {
    // Retrieve the review from the database
    const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) });
    console.log('Review:', review);
    console.log("ID: ", reviewId);

    // Render the update review form with the retrieved review
    res.render('updateReview', { review });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving review from database');
  }
});

// Update Review Route (handle the form submission)
app.post('/updateReview', async (req, res) => {
  const reviewId = req.query.id;

  // Create an updated review object with form field values
  const updatedReview = {
    title: req.body.reviewTitle,
    country: req.body.countryName,
    visitTime: req.body.visitTime,
    tripLength: req.body.tripLength,
    vacationType: req.body.vacationType,
    experience: req.body.experience,
    userName: req.body.name,
    userId: req.body.userId
  };

  try {
    // Update the review in the database
    const result = await reviewsCollection.updateOne({ _id: new ObjectId(reviewId) }, { $set: updatedReview });
    console.log(`Updated review in database with ID: ${reviewId}`);

    // Redirect to the reviews page
    res.redirect('/reviews');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating review in database');
  }
});

app.get('/searchReviews', async (req, res) => {
  try {
    // Retrieve the country query from the URL parameters
    const country = req.query.country;

    // Create a case-insensitive regex pattern for the country search
    const countryRegex = new RegExp(country, 'i');

    // Retrieve all reviews from the reviews collection, filtered by the specified country
    const reviews = await reviewsCollection.find({ country: countryRegex }).toArray();
    console.log("Reviews:", reviews);

    // Retrieve the user's ID from the session
    const userId = req.session._id;

    // Retrieve the user's reviews from the reviews collection
    const myReviews = await reviewsCollection.find({ userId }).toArray();
    console.log("My Reviews:", myReviews);

    // Render the reviews page with the retrieved reviews and user's reviews
    res.render('reviews', { reviews, myReviews });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

app.listen(port, () => {
  console.log("Port listening on " + port)
});
