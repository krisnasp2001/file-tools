export const en = {
  common: {
    home: "Home",
    tools: "Tools",
    allTools: "All Tools",
    about: "About",
    privacy: "Privacy",
    privacyPolicy: "Privacy Policy",
    donate: "Donate",
    donation: "Donation",
    browse: "browse",
    browseFiles: "Browse files",
    dropFilesHere: "Drop your files here",
    dropFilesToAdd: "Drop files to add them",
    orChooseFile: "or choose a file from your device",
    orChooseFiles: "or choose files from your device",
    supportedFormats: "Supported formats",
    maxFileSize: "Max file size: {size}",
    selectedFiles: "Selected Files",
    clearAll: "Clear All",
    remove: "Remove",
    download: "Download",
    downloadAll: "Download All",
    cancel: "Cancel",
    reset: "Reset",
    close: "Close",
    loading: "Loading...",
    processing: "Processing... ({percent}%)",
    converting: "Converting... ({percent}%)",
    exporting: "Exporting...",
    success: "Success",
    error: "Error",
    feedback: "Feedback",
    clientSidePrivacy: "100% Client-Side Processing",
    privacyBadge: "Browser-based file privacy",
    privacyDescription:
      "Your files remain entirely on your device. All rendering, previewing, and transformations happen directly inside your web browser. Nothing is uploaded to external servers.",
    clientSideFeature: "100% Client-side",
    noCloudUpload: "No cloud upload",
    noAdsTracking: "No ads • No tracking • No accounts required",
    allRightsReserved: "All rights reserved.",
    footerTagline: "Free, private, and client-side browser file utilities.",
    footerAttribution: "Independently developed with a focus on useful tools, fewer distractions, and privacy-conscious file processing.",
  },
  about: {
    title: "About File Tools",
    heroTitle: "Built for a simpler way to work with files.",
    intro1:
      "File Tools started as a personal project built to solve a few everyday problems.",
    intro2:
      "As a developer, I often need to convert files, make small PDF edits, combine screenshots into a PDF, or trim audio and video. While looking for tools to get these tasks done, I sometimes encountered websites with intrusive pop-up ads. I also had concerns about uploading confidential or sensitive files to online converters without fully understanding how those files would be handled.",
    intro3:
      "These experiences inspired me to build File Tools: a collection of practical file utilities designed to make everyday tasks simpler, with a greater focus on privacy and a less distracting experience.",
    whyExistsHeading: "Why File Tools exists",
    whyExistsP1:
      "I originally built these tools for my own needs. Over time, I realized that the same tools might be useful to other people, too.",
    whyExistsP2:
      "So, instead of keeping the project to myself, I decided to make it available for everyone to use.",
    whyExistsP3:
      "My goal is simple: to provide useful tools for everyday file tasks without unnecessary distractions, complicated workflows, or artificial barriers to essential features.",
    privacyMattersHeading: "Privacy matters",
    privacyMattersP1:
      "Files can contain personal information, work documents, or other sensitive content. That is why privacy is an important consideration in how File Tools is designed.",
    privacyMattersP2:
      "Where technically possible, file processing is designed to happen directly in your browser rather than requiring files to be uploaded to a remote server. However, processing methods may differ between tools, so please refer to the Privacy Policy for details about how your files are handled.",
    workInProgressHeading: "A work in progress",
    workInProgressP1:
      "File Tools is an independent project, and it is still evolving.",
    workInProgressP2:
      "Some features may have limitations, unexpected behavior, or room for improvement. Parts of the development process have also been assisted by AI tools. I believe it is important to be transparent about that while continuing to test, refine, and improve the application.",
    workInProgressP3:
      "Your feedback, bug reports, and suggestions are valuable. They help me understand what works, what needs fixing, and which features would be most useful to build next.",
    builtTogetherHeading: "Built independently, improved together",
    builtTogetherP1:
      "File Tools is a project I started to make my own work easier, and I hope it can make your work a little easier, too.",
    builtTogetherP2:
      "Thank you for giving it a try. If you encounter a problem or have an idea for improvement, please consider sharing your feedback.",
    closingMotto: "Useful tools. Fewer distractions. A more thoughtful approach to privacy.",
    viewPrivacyPolicy: "Read our Privacy Policy",
    sendFeedback: "Share Feedback or Report an Issue",
    supportProject: "Support the Project",
  },
  privacyPage: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: October 2026",
    subtitle: "A transparent overview of how files and data are handled in File Tools.",
    approachHeading: "1. Our approach to privacy",
    approachP1:
      "File Tools is built around a simple principle: handling your files should be as straightforward and privacy-conscious as possible.",
    approachP2:
      "Some tools are designed to process files directly in your browser, which can reduce the need to upload file contents to a remote server. However, processing methods may vary depending on the tool and the technology it uses.",
    approachP3:
      "This Privacy Policy explains how File Tools handles files and related information. Please read it before using the application, especially when working with confidential or sensitive documents.",
    processingHeading: "2. How your files are processed",
    processingP1:
      "All file conversion, editing, and rendering tools currently implemented in File Tools execute entirely inside your local browser tab (client-side execution).",
    processingListClient:
      "Client-side processing: Operations such as PDF editing, document conversion, image format transformation, audio trimming, and video processing utilize web standards (HTML5 Canvas, WebAssembly, and JavaScript libraries) executed by your device's browser engine.",
    processingListServer:
      "Server-side file uploads: File Tools has no server-side file upload queues, database processing pipelines, or remote document storage endpoints. Your file contents are not transmitted to or stored on our servers.",
    processingListThirdParty:
      "Third-party libraries & external runtime resources: Certain heavy operations (such as media conversion with FFmpeg WebAssembly or optical character recognition with Tesseract.js) download external WebAssembly binaries and language dictionaries from public content delivery networks (CDNs) to run locally in your browser. These CDN requests download code resources, not your file contents.",
    storageHeading: "3. File storage and retention",
    storageP1:
      "We do not store your files on external servers or databases. Files selected for processing are loaded into your browser's temporary memory (RAM) and accessed via short-lived in-memory Object URLs.",
    storageP2:
      "When you close the browser tab, navigate away, or click 'Clear All', temporary memory references are released and revoked. Converted and exported files exist only on your local device once downloaded.",
    technicalHeading: "4. Technical information & hosting logs",
    technicalP1:
      "When you access File Tools over the internet, standard web hosting infrastructure automatically logs basic technical request metadata (such as visitor IP addresses, browser User-Agent strings, and request timestamps) to maintain network security, mitigate denial-of-service attempts, and ensure high availability.",
    storageCookiesHeading: "5. Cookies and local storage",
    storageCookiesP1:
      "File Tools does not use third-party tracking cookies, advertising identifiers, or cross-site tracking technologies.",
    storageCookiesP2:
      "Browser Local Storage and cookies are used strictly to remember your preferences (such as your chosen interface language: 'file-tools-lang'). You can clear this preference at any time through your browser settings.",
    thirdPartyHeading: "6. Third-party services",
    thirdPartyP1:
      "File Tools does not embed tracking pixels, social media widgets, or advertising networks. The only third-party network interactions involve hosting infrastructure and delivery of public open-source libraries (e.g., FFmpeg core WASM distribution).",
    donationsHeading: "7. Donations",
    donationsP1:
      "Donations are completely optional and are not required to access any tool or feature. File Tools never gates functionality behind payments. If you choose to support the project via an external donation platform, payment processing is governed entirely by the external provider's privacy policy and terms.",
    changesHeading: "8. Changes to this policy",
    changesP1:
      "As File Tools evolves, new features or technical integrations may require updates to this policy. Any changes will be reflected directly on this page with a revised date.",
    contactHeading: "9. Contact and feedback",
    contactP1:
      "If you have questions about privacy practices or wish to report a bug or suggestion, please visit our Feedback page.",
  },
  home: {
    heroTitleLine1: "Simple file tools.",
    heroTitleLine2: "Right in your browser.",
    heroSubtitle:
      "Convert and manage files with high-speed client-side browser tools. No wait queues, private and secure.",
    searchPlaceholder: "Search for a tool (e.g., PDF to Image, MP4 to WebM)...",
    searchLabel: "Search all tools",
    exploreCategories: "Explore Tools by Category",
    searchResultsFor: 'Search Results for "{query}"',
    noToolsFound: 'No tools found matching "{query}"',
    viewAllTools: "View all {count} tools",
    availableToolsCount: "{count} Tools available",
  },
  validation: {
    fileEmpty: "File is empty",
    fileTooLarge: "This file is too large. The maximum allowed size is {maxSize}.",
    fileTypeNotSupported: "This file type isn't supported by this tool.",
  },
  categories: {
    image: {
      name: "Image",
      description: "Convert, resize, and optimize images.",
    },
    pdf: {
      name: "PDF",
      description: "Create, convert, merge, and manage PDFs.",
    },
    document: {
      name: "Document",
      description: "Work with DOCX, PPTX, XLSX and text documents.",
    },
    data: {
      name: "Data",
      description: "Convert and format structured JSON, CSV, and XML data.",
    },
    audioVideo: {
      name: "Audio & Video",
      description: "Convert and process media files locally.",
    },
  },
  mediaTools: {
    audioConverter: {
      title: "Audio Converter",
      description: "Convert between various audio formats locally in your browser. Supports MP3, WAV, OGG, FLAC, and AAC.",
      badge: "Client-Side WASM",
      uploadTitle: "Upload Audio File",
      targetFormat: "Target Format",
      convertButton: "Convert Audio",
      downloadButton: "Download Converted Audio",
      convertAnother: "Convert Another File",
      conversionSuccess: "Conversion Complete!",
      readyToDownload: "Your converted audio file is ready to download.",
      wasmNotice: "Processing happens locally in your browser using FFmpeg WebAssembly. Large files may take some time depending on your device's performance. First load might take a moment to download the WebAssembly core.",
    },
    videoConverter: {
      title: "Video Format Converter",
      description: "Convert videos between MP4, WebM, AVI, and MOV locally in your browser using WebAssembly. Secure, private, with zero server uploads.",
      badge: "Client-Side WASM",
      targetFormat: "Target Format",
      qualityPreset: "Quality Preset",
      qualityHigh: "High (Near Lossless)",
      qualityMedium: "Medium (Balanced)",
      qualityLow: "Low (Smaller Size)",
      convertButton: "Convert Video",
      convertingProgress: "Converting Video... ({percent}%)",
      cancelButton: "Cancel Conversion",
      cancelledNotice: "Conversion cancelled by user.",
      downloadButton: "Download Converted Video",
      convertAnother: "Convert Another Video",
      outputPreview: "Output Preview",
    },
    videoFrameExtractor: {
      title: "Video Frame Extractor",
      description: "Extract high-resolution image frames from videos locally in your browser. Capture single frames at specific timestamps or batch extract across intervals.",
      badge: "Client-Side Canvas",
      extractCurrentFrame: "Extract Current Frame",
      batchExtraction: "Batch Extraction",
      byInterval: "By Interval (seconds)",
      byTotalCount: "By Total Frame Count",
      extractFramesAction: "Extract Frames",
      downloadZip: "Download All as ZIP",
      clearAllFrames: "Clear All Frames",
      confirmClear: "Are you sure you want to remove all extracted frames?",
      framesCount: "Extracted Frames ({count})",
      noFramesYet: "No frames extracted yet. Play or seek the video and click \"Extract Current Frame\" or use batch extraction.",
    },
    videoTrimmer: {
      title: "Video Trimmer",
      description: "Cut and trim video clips client-side with millisecond precision without uploading to any remote server.",
      badge: "Client-Side WASM",
      trimButton: "Trim & Export Video",
      startTime: "Start Time",
      endTime: "End Time",
      duration: "Selected Duration",
    },
    audioTrimmer: {
      title: "Audio Trimmer",
      description: "Trim audio tracks and cut audio clips client-side with millisecond precision without uploading to any remote server.",
      badge: "Client-Side WASM",
      trimButton: "Trim & Export Audio",
      startTime: "Start Time",
      endTime: "End Time",
      duration: "Selected Duration",
    },
    videoToAudio: {
      title: "Video to Audio Converter",
      description: "Extract high-quality audio tracks from video files locally in your browser. Supports MP3, WAV, AAC, and OGG output.",
      badge: "Client-Side WASM",
      extractAudioButton: "Extract Audio",
      targetAudioFormat: "Target Audio Format",
    },
  },
  pdfVisualEditor: {
    title: "PDF Visual Editor",
    description: "Edit PDF text visually while preserving the original layout and graphics.",
    uploadPrompt: "Upload a PDF",
    dragDropOrClick: "Drag and drop or click to browse",
    selectPdfFile: "Select PDF File",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {current} of {total}",
    startOver: "Start Over",
    exportPdf: "Export PDF",
    savingNotice: "Saving your modified PDF...",
  },
  feedbackPage: {
    title: "Send Feedback",
    subtitle:
      "Found a bug, have an idea, or just want to say something? We'd love to hear from you.",
    privacyNote:
      "Your message will open in your local email client. Your email address is not stored or transmitted through this website.",
    typeLabel: "What kind of feedback is this?",
    typeBug: "Bug Report",
    typeFeature: "Feature Request",
    typeGeneral: "General",
    typePraise: "Praise",
    toolLabel: "Which tool is this about?",
    toolPlaceholder: "Select a tool (optional)",
    optional: "optional",
    messageLabel: "Your message",
    messagePlaceholder:
      "Describe what happened, what you expected, or your suggestion…",
    howItWorks:
      "Clicking 'Send Feedback' will open your device's email client with a pre-filled message. You are in control of what is sent.",
    submitButton: "Open Email Client",
    submitting: "Preparing…",
    sendAnother: "Send Another",
    successTitle: "Email client opened!",
    successBody:
      "Your email client has been opened with a pre-filled message. Review it and click Send when you're ready.",
    errorGeneric: "Something went wrong. Please try again.",
    unavailableTitle: "Feedback temporarily unavailable",
    unavailableBody:
      "The feedback form is temporarily unavailable. Please try again later.",
    nudgeTitle: "Enjoying File Tools?",
    nudgeBody:
      "Got a moment? Let me know what's working and what could be better.",
    nudgeCta: "Share Feedback",
    nudgeDismiss: "Maybe later",
    nudgeAriaLabel: "Feedback invitation",
  },
  donatePage: {
    title: "Support File Tools",
    subtitle:
      "File Tools is free to use and always will be. If it has saved you time or made your work a little easier, consider buying me a coffee.",
    alwaysFreeNote:
      "Donations are completely optional. All tools remain free, with no paywalls and no ads — regardless of whether you donate.",
    whyHeading: "Where your support goes",
    perkMaintenance: "Ongoing maintenance, bug fixes, and quality improvements",
    perkNewTools: "Development of new tools and features",
    perkHosting: "Hosting and infrastructure costs",
    perkPrivacy: "Keeping File Tools free, private, and ad-free",
    badgePopular: "Indonesia",
    saweriaDescription:
      "Saweria is a local Indonesian platform for supporting independent creators. You can make a one-time contribution of any amount — no account required.",
    donateButton: "Support on Saweria",
    donateButtonAriaLabel: "Support File Tools on Saweria (opens in new tab)",
    externalNote: "You will be taken to saweria.co — an external site.",
    futureHeading: "What's coming next",
    futureBody:
      "I'm continuously working on improving existing tools, fixing bugs, and expanding the collection. Your support helps me dedicate more time to making File Tools better for everyone.",
    closingNote:
      "Thank you for using File Tools — your support, feedback, and kind words mean a lot.",
  },
};

export type Translations = typeof en;
