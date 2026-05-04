module.exports = {
  apps: [
    {
      name: "somarnix",
      cwd: "/home/somarnix/htdocs/somarnix.com",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
