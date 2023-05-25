require("./utils.js");
require("dotenv").config();

// chatGPT module import
const { Configuration, OpenAIApi } = require("openai");
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Required module imports
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cron = require("node-cron") // schedule to send email after user's trip ends
const nodemailer = require("nodemailer"); // send email
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const path = require('path');

const saltRounds = 12;

const app = express();
app.use(express.json());

const Joi = require("joi");
const port = process.env.PORT || 2000;
const expireTime = 2 * 60 * 60 * 1000; //expires after 2 hr (minutes * seconds * millis)

// mongoDB connection details
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET; 

// Variables to access mongoDB collections
var { database } = include("databaseConnection");
const userCollection = database.db(mongodb_database).collection("users");
const untrvl_countries = database
  .db(mongodb_database)
  .collection("under-travelled_countries");
const reviewsCollection = database.db(mongodb_database).collection('reviews');

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

// Create session 
app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);

// Checks to see if the user is logged in and has a valid session
function isValidSession(req) {
  if (req.session.authenticated) {
    return true;
  }
  return false;
}

// Allows user to see the site if session is valid
function sessionValidation(req, res, next) {
  if (isValidSession(req)) {
    next();
  } else {
    res.redirect("/");
  }
}

// Notification
function sendEmail(username, useremail, country, date) {
  // Create a transporter object with your SMTP configuration
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
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

      <p>AdvenTour always value your privacy, if you don't want to receive this email, you can log in and change the privacy settings on your profile.</p>
      

      <img width="400px" src="cid:logo" alt="AdvenTour Logo">
      `,
    attachments:[
      {
        fileName: "logo",
        path: "public/logo.png",
        cid: "logo"
      }
    ]
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

// Schedule the task everyday at 6am to check if any user's trip ends
cron.schedule('0 6 * * *', async () => {
  const users = await userCollection.find().toArray();
  // Iterate through the users and send emails
  users.forEach(async (user) => {
    // Check if user has marked countries
    if (user.markedCountry && user.markedCountry.length > 0) {
      user.markedCountry.forEach((country) => {
        const username = user.username;
        const useremail = user.email
        countryName = country.countryName

        const endDate = country.endDate
        const date = new Date(endDate)
        const month = date.getMonth() + 1
        const day = date.getDate();
        const cronDate = "0 6 " + day + " " + month;
        console.log(countryName)
        console.log(username)
        console.log(useremail)
        console.log(username)
        console.log(cronDate)
        sendEmail(username, useremail, countryName, cronDate);
      })
    }
  })
  console.log('Emails sent to all users.');  
})

// Landing page
app.get("/", (req, res) => {
  res.render("landing");
});

// Easter egg
app.get("/easterEgg", (req, res) => {
  res.render("easterEgg");
});

// Handles nosql-injection attacks 
app.get("/nosql-injection", async (req, res) => {
  var username = req.query.user;

  if (!username) {
    res.send(
      `<h3>no user provided - try /nosql-injection?
        user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
    );
    return;
  }
  console.log("user: " + username);
  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.send("<h1>A NoSQL injection attack was detected!</h1>");
    return;
  }

  const result = await userCollection
    .find({ username: username })
    .project({ username: 1, password: 1, _id: 1 })
    .toArray();
  console.log(result);

  res.send(`<h1>Hello ${username}</h1>`);
});

// Sign up page
app.get("/signup", (req, res) => {
  res.render("signup", { errorMessage: "" });
});

// Create account for new user (user, email, password, security answer)
app.post("/signupSubmit", async (req, res) => {
  var username = req.body.username.trim();
  var email = req.body.email.trim();
  var password = req.body.password.trim();
  var securityAnswer = req.body.securityAnswer.trim();

  // Validated using joi
  const schema = Joi.object({
    username: Joi.string().alphanum().max(20).required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    securityAnswer: Joi.string().required()
  });

  const validationResult = schema.validate({
    username,
    password,
    email,
    securityAnswer
  });

  // Error messages if input is wrong
  if (validationResult.error != null) {
    const errorMessage = validationResult.error.message;
    // Look at terminal to see error message
    console.log(validationResult.error);

    if (errorMessage.includes("username")) {
      const errorMessage = "Name is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes("email")) {
      const errorMessage = "Email is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes("password")) {
      const errorMessage = "Password is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }

    if (errorMessage.includes("securityAnswer")) {
      const errorMessage = "Security answer is required.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  } else {
    // Check if user with the same email already exists
    const existingUser = await userCollection.findOne({ email: email });
    if (existingUser) {
      // Email already taken, handle accordingly
      const errorMessage = "Email already in use.";
      res.render("signup", { errorMessage: errorMessage });
      return;
    }
  }

  // Hashes the password using bcrypt before storing
  var hashedPassword = await bcrypt.hash(password, saltRounds);

  // Stores the user information to our users database
  const result = await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
    securityAnswer: securityAnswer,
    profilePicture: "profilepic3.png",
    emailNotifications: true // Default value for email notification preference
  });
  console.log("Inserted user");

  // Create a session and redirect to main page
  req.session.user = {
    username: username,
    email: email
  };

  // Sets authentication to true
  req.session.authenticated = true;

  // Sets their username
  req.session.username = username;

  // Sets user"s id in the user session
  req.session._id = result.insertedId;

  res.redirect("/quizWelcome");
});

// Log in page
app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", successMessage: "" });
});

// Log in using email and password
app.post("/loggingin", async (req, res) => {
  var email = req.body.email.trim();
  var password = req.body.password.trim();

  // User input validated using joi
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

  // Error messages if input is not valid
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

// Allow users to change their password 
app.post("/changePassword", async (req, res) => {
  const existingEmail = req.body.email.trim();
  const securityAnswer = req.body.securityAnswer.trim();

  // Validate their email and security answer
  const existingUser = await userCollection.findOne({
    email: existingEmail,
    securityAnswer: securityAnswer
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

// Reset password function 
app.post("/resetPassword", async (req, res) => {
  const newPassword = req.body.password.trim();
  const confirmPassword = req.body.confirmPassword.trim();
  const email = req.session.email.trim();

  // Error message if the entered password doesn't match
  if (newPassword !== confirmPassword) {
    const errorMessage = "Passwords do not match";
    res.render("resetPassword", { errorMessage: errorMessage, email: email });
    return;
  } else {
    // Password is hashed before updating in database
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await userCollection.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    res.render("login", {
      successMessage:
        "Your password has been changed successfully. Please log in again.",
      errorMessage: ""
    });
    console.log("password is changed for user with this email: ", email);
  }
});

// Quiz welcome page
app.get("/quizWelcome", (req, res) => {
  res.render("quizWelcome", { name: req.session.username });
});

// Render the quiz page if user is authenticated
app.get("/quiz", (req, res) => {
  if (!req.session.authenticated) {
    // Redirect to the landing page if not authenticated
    res.redirect("/");
  } else {
    const name = req.session.name;
    const userId = req.session._id;
    res.render("quiz", { name, userId });
  }
});

// Save the user's preference quiz answers
app.post("/quiz", async (req, res) => {
  const userId = req.session._id;
  const answers = {
    question1: req.body.question1,
    question2: req.body.question2,
    question3: req.body.question3,
    question4: req.body.question4,
    question5: req.body.question5
  };

  try {
    // Update the user's quizAnswers in the database
    const result = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { quizAnswers: answers } }
    );
    console.log("Answers saved to database");
    res.redirect("/gachaLoading");
  } catch (err) {
    console.error(err);
    // Handle errors when saving quiz answers to the database
    res.status(500).send("Error saving quiz answers to database");
  }
});

// Logging out destroys the session
app.get("/logout", (req, res) => {
  req.session.destroy();
  console.log("user logged out");
  res.redirect("/");
});

// Isolate keywords from chatGPT response and uses 
// them to search for and return related images
async function getFactImages(place) {
  const factImageUrls = [];
  for (x in place) {
    var testFact = place[x];
    console.log(testFact);

    try {
      const requestURL = `https://api.unsplash.com/search/photos?query=
        ${testFact}&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
      const response = await fetch(requestURL);
      const responseBody = await response.json();
      var imageURL = responseBody.results[0].urls.regular;
      factImageUrls.push(imageURL);

      // If no images available from search, a default picture will be used instead
    } catch (err) {
      console.log(err);
      const defaultURL = `https://api.unsplash.com/search/photos?query=
        continental-breakfast&client_id=${process.env.UNSPLASH_ACCESSKEY}`;
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

    // Retrieve quiz answers from database
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
      presence_penalty: 0.0
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
          promptAnswerPlaces: resultFactNames
        },
      }
    );

    res.redirect(`/mainLoading`);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Users are allow to mark the country for next trip
// and save the end date of the trip into database
app.post("/markCountry", async (req, res) => {
  try {
    const userId = req.session._id;
    const result = await userCollection.findOne({ _id: new ObjectId(userId) });
    const markedCountries = result.markedCountry || {};

    const markedCountry = req.body.mark;
    const endDate = req.body.endDate;

    // Add marked country
    let recordExists = false;
    if (markedCountries.length !== 0) {
      for (let i = 0; i < markedCountries.length; i++) {
        let record = markedCountries[i];
        if (record.countryName === markedCountry) {
          recordExists = true;
          break;
        }
      }
    }
    if (recordExists) {
      try {
        await userCollection.updateOne(
          {
            _id: new ObjectId(userId),
            "markedCountry.countryName": markedCountry,
          },
          { $set: { "markedCountry.$.endDate": endDate } }
        );
        res.redirect("/bookmarks");
      } catch (error) {
        console.error(error);
      }
    } else {
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $push: {
            markedCountry: { countryName: markedCountry, endDate: endDate },
          },
        }
      );
      res.redirect("/bookmarks");
    }
  } catch (error) {
    console.error(error);
  }
});

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

    res.render("main", {
      facts: facts,
      gachaCountry,
      imagesList,
      isBookmarked,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/noCountry");
  }
});

// Loads this page when no country has been selected
app.get("/noCountry", sessionValidation, (req, res) => {
  res.render("noCountry");
});

// Saves/deletes a country to/from the database when bookmark button is clicked
app.post("/bookmark", sessionValidation, async (req, res) => {
  try {
    const userId = req.session._id;

    const result = await userCollection.findOne({ _id: new ObjectId(userId) });

    const bookmarkedCountries = result.savedCountries || [];
    const markedCountries = result.markCountry || [];
    const gachaCountry = result.currentCountry;

    var isBookmarked;

    if (bookmarkedCountries.includes(gachaCountry)) {
      // Removes bookmark
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        {
          $pull: { savedCountries: gachaCountry }
        }
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
});

// Render the user's profile page
app.get("/profile", async (req, res) => {
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });
  console.log(user);

  // Check if the user has completed the travel quiz to accurately render the profile page
  const hasCompletedQuiz =
    user.quizAnswers &&
    Object.values(user.quizAnswers).every((answer) => answer !== "");

  // Render the profile page and pass the user and hasCompletedQuiz as variables
  res.render("profile", { user, hasCompletedQuiz });
});

// Update user profile 
app.post("/updateProfile", async (req, res) => {
  const userId = req.session._id;
  const user = await userCollection.findOne({ _id: new ObjectId(userId) });

  // Determines if a field should be updated or keep its existing value from the user
  const updatedFields = {
    username: req.body.username ? req.body.username : user.username,
    email: req.body.email ? req.body.email : user.email,
    password: req.body.password
      ? await bcrypt.hash(req.body.password, 10)
      : user.password,
    securityAnswer: req.body.securityAnswer
      ? req.body.securityAnswer
      : user.securityAnswer,
    profilePicture: req.body.profilePicture
      ? path.basename(req.body.profilePicture)
      : user.profilePicture,
    emailNotifications: req.body.emailNotifications === "on", // Convert checkbox value to boolean
  };

  // Filters any fields that are null so null fields will not be saved
  const nonNullFields = {};
  for (const [key, value] of Object.entries(updatedFields)) {
    if (value !== null) {
      nonNullFields[key] = value;
    }
  }

  // Update only the non-null fields in the user's profile in the database
  await userCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: nonNullFields }
  );

  // Redirect to the user's profile page
  res.redirect("/profile");
});

// Get the answers from quiz for gacha page
async function getQuizAnswers(userId) {
  console.log(userId)
  const result = await userCollection
    .find({_id: new ObjectId(userId) })
    .project({ quizAnswers: 1 })
    .toArray();
  console.log(result);
  const quizAnswers = result[0].quizAnswers;
  return quizAnswers;
}

// Country generator function for gacha page
// It picks up the quiz answers and form the prompt and feed to openai API
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
        location: the location of the recommended country,
        descr: one sentence description of the courtry
    }]    
  `;
  console.log(prompt);
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });
  try {
    const parsedResponse = JSON.parse(response.data.choices[0].message.content);
    return parsedResponse;
  } catch (error){
    console.log(error)
    res.render("404")
  }

}

// Double confirm that the countries chatGPT provided is under-travelled by cross-checking the under-travelled countries collection in the database
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
          const shuffledArray = confirmedCountries.sort(
            () => Math.random() - 0.5
          );
          return shuffledArray.slice(0, 3);
        }
        getRandom3Countries();
        confirmedCountries = confirmedCountries.slice(0, 3);
      }
    } catch (err) {
      console.error("Error executing MongoDB query:", err);
    }
  }
  return confirmedCountries;
}

// Generate images for the countries generated from openai API
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

// Loading page 
app.get("/gachaLoading", sessionValidation, (req, res) => {
  res.render("gachaLoading");
});

// Gacha page
app.get("/gacha", sessionValidation, async (req, res) => {
  const name = req.session.username;
  const quizAnswers = await getQuizAnswers(req.session._id);

  // Check if the user has completed the quiz
  if (!quizAnswers || quizAnswers.length === 0) {
    return res.redirect("/completeQuiz");
  }

  const generatedCountries = await countryGenerator(quizAnswers);
  const confirmedCountries = await checkCountries(generatedCountries);
  let cardVisibility = "d-none";
  let flipVisibility = "d-block";
  if (confirmedCountries.length === 0) {
    cardVisibility = "d-block";
    flipVisibility = "d-none";
  }
  const imageURLs = await getImage(confirmedCountries);
  res.render("gacha", {
    name,
    confirmedCountries,
    quizAnswers,
    imageURLs,
    cardVisibility,
    flipVisibility,
  });
});

// Loads this page when no country has been selected
app.get("/completeQuiz", sessionValidation, (req, res) => {
  res.render("completeQuiz");
});

// Review page
app.get("/reviews", async (req, res) => {
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
    res.render("reviews", { reviews, myReviews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Renders the review form
app.get("/reviewForm", sessionValidation, (req, res) => {
  console.log(req.body);
  var country = req.query.country;
  console.log(country);
  var userId = req.session._id;
  var name = req.session.username;
  res.render("reviewForm", { name, userId, country });
});

// Saves the user's review
app.post("/reviewForm", async (req, res) => {
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
    userId: req.body.userId,
  };
  console.log(review);

  try {
    // Save the review to the database
    const result = await reviewsCollection.insertOne(review);
    console.log(`Saved review to database with ID: ${result.insertedId}`);

    // Redirect to the thank you page
    res.redirect("/thankyou");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving data to database");
  }
});

// Shown after leaving a review
app.get("/thankyou", (req, res) => {
  res.render("thankyou");
});

// Delete review 
app.get("/deleteReview", async (req, res) => {
  const reviewId = req.query.id;

  try {
    // Delete the review from the database
    const result = await reviewsCollection.deleteOne({
      _id: new ObjectId(reviewId),
    });
    console.log(`Deleted review from database with ID: ${reviewId}`);

    // Redirect to the reviews page
    res.redirect("/reviews");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting review from database");
  }
});

// Renders the update review form
app.get("/updateReview", async (req, res) => {
  const reviewId = req.query.id;
  console.log("ID: ", reviewId);

  try {
    // Retrieve the review from the database
    const review = await reviewsCollection.findOne({
      _id: new ObjectId(reviewId),
    });

    // Render the update review form with the retrieved review
    res.render("updateReview", { review });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving review from database");
  }
});

// Saves the updated review
app.post("/updateReview", async (req, res) => {
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
    userId: req.body.userId,
  };
  try {
    // Update the review in the database
    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: updatedReview }
    );
    console.log(`Updated review in database with ID: ${reviewId}`);

    // Redirect to the reviews page
    res.redirect("/reviews");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating review in database");
  }
});

// Search reviews by country name
app.get("/searchReviews", async (req, res) => {
  try {
    // Retrieve the country query from the URL parameters
    const country = req.query.country;

    // Create a case-insensitive regex pattern for the country search
    const countryRegex = new RegExp(country, "i");

    // Retrieve all reviews from the reviews collection, filtered by the specified country
    const reviews = await reviewsCollection
      .find({ country: countryRegex })
      .toArray();
    console.log("Reviews:", reviews);

    // Retrieve the user"s ID from the session
    const userId = req.session._id;

    // Retrieve the user's reviews from the reviews collection
    const myReviews = await reviewsCollection.find({ userId }).toArray();
    console.log("My Reviews:", myReviews);

    // Render the reviews page with the retrieved reviews and user's reviews
    res.render("reviews", { reviews, myReviews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.use(express.static(__dirname + "/public"));

// 404 page
app.get("*", (req, res) => {
  res.status(404);
  res.render("404");
});

app.listen(port, () => {
  console.log("Port listening on " + port);
});
