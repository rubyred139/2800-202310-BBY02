function bookmark(country, userId) {
  userCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        savedCountries: country,
      },
    }
  );
  console.log(country);
}
