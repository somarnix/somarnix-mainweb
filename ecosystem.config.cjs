module.exports = {
  apps: [
    {
      name: "gstechkh",
      cwd: "/home/gstechkh/htdocs/gstechkh.com",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
