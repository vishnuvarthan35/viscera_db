const Appointment = require("../model/appointment_schema");
const User = require('../model/user_schema');
const mongoose = require("mongoose");
const twilio = require('twilio');

// Twilio configuration
const accountSid = 'ACfdb846fd6773bd3df58d640adf8e9873';
const authToken = '0704c2f8c23390171f2a6101c7eccfa0';
const twilioClient = twilio(accountSid, authToken);
const twilioWhatsAppNumber = 'whatsapp:+14155238886';

exports.getAppointment = async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: appointments
    });
  } catch (error) {
    console.error('Error retrieving appointments:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving appointments',
      error: error.message
    });
  }
};

exports.getAppointmentsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching appointments for user ID: ${userId}`);

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).send({ message: "User not found" });
    }

    const appointments = await Appointment.find({ user_id: userId })
      .populate("service", "name specialization");

    if (!appointments.length) {
      console.log(`No appointments found for user ID: ${userId}`);
      return res.status(404).send({ message: "No appointments found for this user" });
    }

    return res.status(200).send({
      success: true,
      message: "Appointments retrieved successfully",
      appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { mobile, service, branch, name, email, date, time } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [day, month, year] = date.split('-');
    const appointmentDate = new Date(year, month - 1, day);

    if (isNaN(appointmentDate.getTime()) || appointmentDate < today) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const formattedDate = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;

    const appointment = await Appointment.create({
      user_id,
      mobile,
      service,
      branch,
      name,
      email,
      date: formattedDate,
      time,
      status: "scheduled",
    });

    // Send WhatsApp confirmation
    const whatsappMessage = `Hello ${name}, your appointment has been successfully scheduled on ${formattedDate} at ${time}. Thank you for choosing our service!`;

    await twilioClient.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:+91${mobile}`, // Assuming Indian mobile numbers
      body: whatsappMessage,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ success: false, message: 'Error scheduling appointment', error: error.message });
  }
};

exports.deleteAllAppointment = async (req, res) => {
  try {
    const deleteapp = await Appointment.deleteMany();
    res.status(200).json({
      success: true,
      message: 'All appointments deleted successfully',
      data: deleteapp
    });
  } catch (error) {
    console.error('Error deleting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting appointments',
      error: error.message
    });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointmentId = req.params._id;
    console.log(`Deleting appointment with ID: ${appointmentId}`);

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID not provided' });
    }

    const deletedAppointment = await Appointment.findByIdAndDelete(appointmentId);

    if (!deletedAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully',
      data: deletedAppointment,
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the appointment',
      error: error.message,
    });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointmentId = req.params._id;
    console.log(appointmentId);
    const { mobile, service, branch, name, email, date, time } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const mobileRegex = /^\d{10}$/;
    if (mobile && !mobileRegex.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const [year, month, day] = date.split('-');
    const appointmentDate = new Date(year, month - 1, day);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const formattedDate = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        mobile,
        service,
        branch,
        name,
        email,
        date: formattedDate,
        time,
      },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the appointment',
      error: error.message,
    });
  }
};
