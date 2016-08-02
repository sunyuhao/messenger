'use strict'
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let carsSchema = new Schema({
  _id:String,
  idLanding: String,
  description:String,
  page_url:String,
  image_url:String,
  idCarline:String
},{versionKey:false} );
module.exports = mongoose.model( "Car", carsSchema);
