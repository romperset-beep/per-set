import os

file_path = 'services/geminiService.ts'

with open(file_path, 'r') as f:
    content = f.read()

old_prompt = """    const prompt = `
      Analyze this ${isText ? 'text content' : 'image/document'} which is a list of items to order for a film production.
      Extract the items into a JSON list.
      
      For each item, try to identify:"""

new_prompt = """    const prompt = `
      Analyze this ${isText ? 'text content' : 'image/document'} which is a list of items to order for a film production.
      It might be a handwritten list, a printed document, or a digital text.
      
      Extract the items into a JSON list.
      
      For each item, try to identify:
      - name: The name of the item (in French). Correct any spelling mistakes if possible."""

if old_prompt in content:
    content = content.replace(old_prompt, new_prompt)
    print("Replaced prompt")
else:
    print("Prompt not found")
    # Debug: print a snippet of where it should be
    start_idx = content.find("const prompt = `")
    if start_idx != -1:
        print("Found prompt start, content snippet:")
        print(content[start_idx:start_idx+200])

with open(file_path, 'w') as f:
    f.write(content)
