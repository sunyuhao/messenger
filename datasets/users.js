'use strict'
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let usersSchema = new Schema({
  _id:String,
  user_id: String,
  firstName: String,
  lastName:String,
  civility: String,
  idLanding: String,
  idCarline:String,
  zipcode:String,
  dealer: String,
  dealer_id: String,
  email: String,
  phone: String,
  book: String,
  utm_Campagne:String,
  utm_Medium:String,
  utm_Source:String,
  utm_Content: String,
  utm_Term: String,
  _token:String,
  optin:String
},{versionKey:false} );
module.exports = mongoose.model( "User", usersSchema);
