
Create worktrees: git worktree add ../project-feature-a feature-a
Launch Claude in each worktree: cd ../project-feature-a && claude
Create additional worktrees as needed (repeat steps 1-2 in new terminal tabs)

Some tips:

Use consistent naming conventions
Maintain one terminal tab per worktree
If you’re using iTerm2 on Mac, set up notifications for when Claude needs attention
Use separate IDE windows for different worktrees
Clean up when finished: git worktree remove ../project-feature-a
d. Use headless mode with a custom harness

claude -p (headless mode) integrates Claude Code programmatically into larger workflows while leveraging its built-in tools and system prompt. There are two primary patterns for using headless mode:

1. Fanning out handles large migrations or analyses (e.g., analyzing sentiment in hundreds of logs or analyzing thousands of CSVs):

Have Claude write a script to generate a task list. For example, generate a list of 2k files that need to be migrated from framework A to framework B.
Loop through tasks, calling Claude programmatically for each and giving it a task and a set of tools it can use. For example: claude -p “migrate foo.py from React to Vue. When you are done, you MUST return the string OK if you succeeded, or FAIL if the task failed.” --allowedTools Edit Bash(git commit:*)
Run the script several times and refine your prompt to get the desired outcome.

2. Pipelining integrates Claude into existing data/processing pipelines:

Call claude -p “<your prompt>” --json | your_command, where your_command is the next step of your processing pipeline
That’s it! JSON output (optional) can help provide structure for easier automated processing.

For both of these use cases, it can be helpful to use the --verbose flag for debugging the Claude invocation. We generally recommend turning verbose mode off in production for cleaner output.

What are your tips and best practices for working with Claude Code? Tag @AnthropicAI so we can see what you're building!

Acknowledgements

Written by Boris Cherny. This work draws upon best practices from across the broader Claude Code user community, whose creative approaches and workflows continue to inspire us. Special thanks also to Daisy Hollman, Ashwin Bhat, Cat Wu, Sid Bidasaria, Cal Rueb, Nodir Turakulov, Barry Zhang, Drew Hodun and many other Anthropic engineers whose valuable insights and practical experience with Claude Code helped shape these recommendations.

Looking to learn more?
Explore courses
Get the developer newsletter

Product updates, how-tos, community spotlights, and more. Delivered monthly to your inbox.

Please provide your email address if you’d like to receive our monthly developer newsletter. You can unsubscribe at any time.

Products
Claude
Claude Code
Cowork
Claude in Chrome
Claude in Excel
Claude in Slack
Skills
Max plan
Team plan
Enterprise plan
Download app
Pricing
Log in to Claude
Models
Opus
Sonnet
Haiku
Solutions
AI agents
Code modernization
Coding
Customer support
Education
Financial services
Government
Healthcare
Life sciences
Nonprofits
Claude Developer Platform
Overview
Developer docs
Pricing
Regional Compliance
Amazon Bedrock
Google Cloud’s Vertex AI
Console login
Learn
Blog
Claude partner network
Connectors
Courses
Customer stories
Engineering at Anthropic
Events
Powered by Claude
Service partners
Startups program
Tutorials
Use cases
Company
Anthropic
Careers
Economic Futures
Research
News
Claude’s Constitution
Responsible Scaling Policy
Security and compliance
Transparency
Help and security
Availability
Status
Support center
Terms and policies
Privacy choices
Privacy policy
Consumer health data privacy policy
Responsible disclosure policy
Terms of service: Commercial
Terms of service: Consumer
Usage policy
© 2025 Anthropic PBC