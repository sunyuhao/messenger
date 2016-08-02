'use strict'
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let dealersSchema = new Schema({
  groupe :String,
  options:[{value:String,name:String}]
},{versionKey:false} );
module.exports = mongoose.model( "Dealer", dealersSchema);
