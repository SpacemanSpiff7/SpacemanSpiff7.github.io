---
title: "Why I'm Building My Own Apps Instead of Paying for Yours"
date: "2026-11-12"
summary: "What started as an experiment with AI became a collection of apps I use every day."
draft: false
tags: ["Apps", "AI", "Personal projects"]
---

I can't write Swift. I can't really read it either. But I've been building iPhone apps, and some of them have become things I use every day.

It started as an experiment. I've been fascinated by AI and wanted to see just how capable these coding models had become. I'm a software engineer, but I'd never done any iOS development. Building something in a language I didn't understand seemed like a pretty good test.

I also happened to have an idea.

## An experiment that got out of hand

At the time, I was working with a personal trainer who was a little flaky. He used a subscription-based app to manage my workouts, and despite its clunky, frankly pretty jarring design, I liked a lot of what it did.

You could build workouts, log sets and weights, and review your history. Most importantly, it had a rest timer.

I tend to get lost in the sauce at the gym. I'll finish a set, get distracted, and suddenly I've been resting for five minutes. Or I'll get impatient and start the next set too early. Having a timer built into the workout was surprisingly useful.

The problem was that the app was tied to my trainer's subscription. Once he stopped paying, I couldn't keep using it independently.

So I figured, why not build my own?

That became CurlBro.

I wanted to walk into the gym, press a couple of buttons, and start working out. Track my lifts, manage rest periods, review my progress. Nothing particularly complicated.

Building it wasn't effortless. I spent a surprising amount of time collecting exercise demonstration videos, assembling an exercise catalog, and figuring out how the interface should actually work.

But eventually I had a functional app. I published it on the App Store, and I still use it to track my workouts.

I'd built something genuinely useful in a language I couldn't read.

And that got me thinking.

## Why am I paying for this?

Once I realized I could make my own workout tracker, I started looking at other apps on my phone differently.

My pedometer app was particularly irritating. I'd already paid for lifetime access, but the developers introduced another subscription tier with features I didn't particularly want. Meanwhile, advertisements had become part of an experience I'd originally paid to remove.

I don't have a problem with developers making money. I write software for a living. But I do question why some relatively simple utilities need ongoing subscriptions.

If all I'm doing is recording information and displaying it back to myself, why does it need to live on somebody else's server? Why do I need an account? Why am I paying every month to access data that could live on my phone?

There are legitimate recurring expenses. Cloud infrastructure costs money. AI inference costs money. Software requires maintenance.

But not every app needs a backend, an account system, or an ongoing relationship with a payment processor.

And now that AI makes it practical to build a functional alternative in an afternoon, sometimes even half an hour, the calculation has changed.

Sometimes I can just make the thing I want.

## A growing collection of little tools

After CurlBro, I started building apps for other problems I was having.

Airlock came from my frustration with app blockers. The ones I'd tried were either so restrictive I'd eventually disable them or so permissive I could easily ignore them. I eventually built something that uses short breathing exercises to introduce a little friction before opening distracting apps.

I've also built a pedometer, a cannabis usage tracker, and a mood tracker. I'm working on a calorie tracker that uses AI to estimate calories from food photos.

None of these are revolutionary ideas. There are plenty of commercial alternatives, and many are more polished.

But I don't necessarily need every imaginable feature. I need something that does the few things I care about, does them well, and doesn't make me navigate through advertisements and upgrade prompts to get there.

My pedometer doesn't need to be a social network. My workout tracker doesn't need to ask how I'm feeling every time I open it. And I certainly don't need to discover that my Premium subscription apparently isn't Premium enough.

I just want to use the app.

## Keeping things simple, and personal

As I've built more of these tools, I've developed a few opinions about how I want them to work.

For one, data should stay on the device whenever possible.

Take a mood tracker. There are hundreds available, including plenty of free ones. But mood data is personal, and I don't particularly want to wonder what a company might be doing with it.

I could investigate their privacy policies, or I could build something that stores everything locally.

For features that genuinely need an external service, like AI-powered calorie estimation, I'm experimenting with letting users bring their own API keys. It adds some setup, but avoids introducing another subscription or requiring me to operate a paid AI backend. The data sent for inference still goes to an external provider, of course.

I've also found that making software simple is harder than making it functional.

AI is remarkably good at adding features, sometimes a little too good. I've had prototypes with redundant menus, unnecessary screens, and some truly strange AI-generated copy.

Everything technically worked, but the app didn't feel natural to use.

Increasingly, a lot of my development process involves figuring out what to delete.

## Three users and counting

As far as I know, Airlock has about three users: me, my fiancée, and some random person in the UK.

I'm not exactly running a software empire.

Would I love for one of these apps to become successful enough that somebody offered to buy it? Absolutely. I'm not opposed to making money from software.

But I'm also not interested in turning every little utility into a subscription business.

I've added optional tipping for anyone who wants to show their appreciation. It doesn't unlock anything meaningful. In CurlBro, you get some extra confetti.

That's about as aggressive as my monetization strategy gets.

I'm fortunate that these are personal projects rather than businesses that need to support me. And I certainly haven't figured out how to get thousands of people to use them.

But I started building these apps to experiment with AI, and somewhere along the way they became tools that actually improve parts of my daily life.

Now, whenever I encounter some minor inconvenience, I find myself wondering whether I could just build something to solve it.

And increasingly, I can.
