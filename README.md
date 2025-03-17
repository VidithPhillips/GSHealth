# GSHealth 🏥

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://vidithphillips.github.io/GSHealth/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.4.5-purple)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material%20UI-5.14.18-blue)](https://mui.com/)

A free, open-source web application for mapping healthcare facilities and optimizing ambulance routing in India, with an initial focus on Himachal Pradesh. Our mission is to enhance emergency response times and improve healthcare accessibility, particularly in remote areas.

## 🌐 Live Demo

Visit our live application: [GSHealth Web App](https://vidithphillips.github.io/GSHealth/)

## 🎯 Project Overview

GSHealth addresses critical healthcare accessibility challenges in India by providing:

- 🗺️ Interactive mapping of healthcare facilities (primary, secondary, and tertiary)
- 🚑 Optimal ambulance routing between facilities
- 📊 Analysis of healthcare accessibility
- 🎯 Visualization of healthcare coverage gaps

## ✨ Features

- **Facility Mapping**: Interactive visualization of healthcare centers
- **Search Functionality**: Find specific facilities by type, location, or services
- **Route Planning**: Calculate optimal routes for ambulances
- **Transit Estimation**: Provide estimated travel times considering road conditions
- **Healthcare Accessibility Analysis**: Identify underserved areas

## 🛠️ Technology Stack

- **Frontend Framework**: React.js with Vite
- **UI Components**: Material UI
- **Mapping**: Leaflet.js
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Hosting**: GitHub Pages

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VidithPhillips/GSHealth.git
   cd GSHealth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Sign up for an API key at [OpenRouteService](https://openrouteservice.org/dev/#/signup)
   - Add your API key to the `.env` file:
     ```
     VITE_ORS_API_KEY=your_api_key_here
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## 🗃️ Data Sources

- OpenStreetMap (OSM)
- National Health Mission (NHM)
- Indian Health Facility Registry (HFR)
- NASA SRTM Digital Elevation Data
- Various open-source routing engines

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

Vidith Phillips - [GitHub Profile](https://github.com/VidithPhillips)

Project Link: [https://github.com/VidithPhillips/GSHealth](https://github.com/VidithPhillips/GSHealth) 