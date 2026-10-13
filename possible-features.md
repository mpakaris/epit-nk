# Possible Features

## 1. Automatized Quotes
Automatically generate a quote (ajanlat) from a completed canvas (felmeres). The system would pre-fill quote sections and line items based on the room breakdown and measurements captured in the canvas, reducing manual re-entry. Could also include a template system so common job types (e.g. bathroom renovation) produce a standardized starting point. Optionally, AI could suggest pricing based on historical quotes for similar projects.

## 2. Demo Mode
A sandboxed demo environment (no real entity/data) that prospective customers can explore without signing up. Pre-populated with fictional projects, invoices, and quotes to showcase the full pipeline: Canvas → Quote → Project.

## 3. OCR and AI to Analyze Invoices
Upload a supplier invoice image or PDF; OCR extracts the line items, amounts, and VAT; AI maps them to the correct project room and cost category. Reduces manual invoice entry and catches misclassifications.

## 4. AI Feedback on Canvas / Quotes / Final Project
Feed the completed canvas, quote, and final project cost breakdown into an AI model and receive structured feedback: budget overruns, rooms that consistently exceed estimates, suggestions for better cost allocation, and a plain-language summary for the client.

## 5. Mobile Version
A mobile-optimized (or native PWA) experience focused on the field worker use case: capturing measurements on-site (canvas), uploading supplier invoices via phone camera, and checking project status — without needing a desktop.

## 7. Persistent Login Sessions
Handymen on construction sites should not need to log in repeatedly throughout the day. Extend the Supabase auth session lifetime so users stay logged in for days or weeks. Could be combined with a "remember this device" toggle at login, so trusted personal devices (phones, tablets on-site) maintain the session indefinitely while shared/office devices still expire normally.

## 6. Per-User Public Website (www.tecton.eu/bob-the-builder)
Every registered contractor/entity gets a public-facing profile page at a slug-based URL (e.g. `www.tecton.eu/<slug>`). The page could display portfolio projects, client testimonials, and a contact form — acting as a lightweight marketing site generated automatically from the data already in the system.

## 7. Client can report issues to projects he may have found out after completion 

## 8. Client should be able to review / accept / comment / reject quotes, invoices 

## 9. Client should be able to pay invoices directly via Pay-Link on client Portal 

## 10. websocket for notifications about updates of clients / entity actions 

## 11.