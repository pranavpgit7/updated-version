const mongoose = require('mongoose');
require('dotenv').config();

// const url = 'mongodb://127.0.0.1:27017/spree';
const url = process.env.DATABASE_URI

module.exports = async function connectDB(){
    try{
      await  mongoose.connect(url,{
            useNewUrlParser:true,
            useUnifiedTopology:true
        }).then(()=>{
            console.log("database connected");
        })
    }catch(err){
        console.error(err);
    }
  

}