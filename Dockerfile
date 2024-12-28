# Use an official Node.js runtime as a parent image
FROM node:20.18.0

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install -g nodemon

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the application runs on
EXPOSE 4001

# Start the application
CMD ["npm", "start"]

