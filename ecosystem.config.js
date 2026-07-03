module.exports = {
  apps: [
    {
      name: "1section-api",
      cwd: "./backend",
      script: "./dist/index.js",
      max_memory_restart: "500M",
      log_file: "../logs/api.log",
      error_file: "../logs/api-error.log",
      out_file: "../logs/api-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "1section-app",
      cwd: "./app",
      script: "npm",
      args: "run start -- -p 3000",
      max_memory_restart: "500M",
      log_file: "../logs/app.log",
      error_file: "../logs/app-error.log",
      out_file: "../logs/app-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "1section-dashboard",
      cwd: "./dashboard",
      script: "npm",
      args: "run start -- -p 3001",
      max_memory_restart: "500M",
      log_file: "../logs/dashboard.log",
      error_file: "../logs/dashboard-error.log",
      out_file: "../logs/dashboard-out.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
