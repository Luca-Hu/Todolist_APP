//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-lucas:Hy12345678951@cluster0.ibpvfro.mongodb.net/todolistDB");
// 连接至mongodb数据库（位于计算机本地的数据库）

const itemsSchema = { // 创建集合对象的schema
  name: String
};

const Item = mongoose.model("item", itemsSchema);
// "item": 集合的单数形式 singular collection name
// "Item": modelName

const defaultItem1 = new Item({
  name: "Welcome to your todolist!"
})

const defaultItem2 = new Item({
  name: "Hit the + button to add a new item."
})

const defaultItem3 = new Item({
  name: "<-- Hit this checkbox to delete an item."
})

const defaultItems = [defaultItem1, defaultItem2, defaultItem3];

const listSchema = {
  name : String,
  items :[itemsSchema]
}

const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems){ // find()函数返回的是一个数组

    if(foundItems.length === 0){

      Item.insertMany(defaultItems, function(err){ //仅在数据库中拿到的数据为空时（说明是第一次运行Server），才添加默认项
        if(err){
          console.log(err);
        }else{
          console.log("Successfully inserted!");
        }
      });

      res.redirect("/"); // 在数据为空，我们仍要打印默认数据，因此在添加默认数据之后，我们重新进入get("/")函数中
    } else {
    res.render("list", {listTitle: "Today", newListItems: foundItems});// 以“list.ejs”为模版
  }
  });

});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, function(err, foundList){ // findOne 返回的只是一个document
    if(!err){
      if(!foundList){ // create a new list
        const list = new List({
          name :customListName,
          items : defaultItems // 使用默认数组（items123）来作为新list的初始化items值
        })

        list.save();
        res.redirect("/" + customListName);
      }else{ // show a existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
});

app.post("/", function(req, res){

  const itemName = req.body.newItem; // newItem:input.name  , newItem(value):input内容
  const listName = req.body.list;  // DeDug: 注意 button.name 别写错！！！
  // list:button.name  , list(value)：button.value ， 用以区分是哪个页面发来的post请求 (准确地说，是区分需要更改的list doc是哪个)

  const item = new Item({
    name : itemName
  });

  if(listName === "Today"){ // 如果是主页面发来的post请求
    item.save(); // 把item保存在 Item 集合中
    res.redirect("/");
  }else{ // 如果是其它页面发来的post请求: the post request is coming from a custom list
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName; // DeDug: 注意 input_hidden.name 别写错！！！
  // list:input_hidden.name  , input(value)：input_hidden.value ， 用以区分是哪个页面发来的post请求 (准确地说，是区分需要更改的list doc是哪个)

  if(listName == "Today"){  // 如果是主页面发来的post请求
    Item.findByIdAndRemove(checkedItemId, function(err){ // callback函数-回调函数 是必要的，否则只会进行find操作
      if(!err){ // 所以即使你觉得没必要检查 err，也不得不进入 if(！err){} 中
        res.redirect("/");
     }
    });
  }else{ // 如果是其它页面发来的post请求: the post request is coming from a custom list.
    // logic： 我们先要按 name :listName，query到list，再在这个list的items数组中查找 name :checkedItemId 的元素并删除。
    List.findOneAndUpdate({name:listName}, {$pull:{items:{_id : checkedItemId}}}, function(err, foundList){
      if(!err){
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if(port == null || port == ""){
  port = 3000;
}
app.listen(port);
