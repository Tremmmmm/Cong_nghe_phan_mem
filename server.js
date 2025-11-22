const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const cors = require("cors");

server.use(cors()); // Cho phép mọi nơi truy cập (quan trọng cho Netlify)
server.use(middlewares);
server.use(router);

const port = process.env.PORT || 3000; // Render sẽ tự cấp Port, nếu không thì dùng 3000
server.listen(port, () => {
    console.log(`JSON Server is running on port ${port}`);
});