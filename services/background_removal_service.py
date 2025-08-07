import sys
import io
import os
import traceback
from PIL import Image

print(f"Python version: {sys.version}", file=sys.stderr)
print(f"Current directory: {os.getcwd()}", file=sys.stderr)
print("Starting background removal script...", file=sys.stderr)

def remove_background(image_data):
    try:
        print(f"Received {len(image_data)} bytes of image data", file=sys.stderr)
        
        try:
            from rembg import remove
            print("Successfully imported rembg", file=sys.stderr)
        except ImportError as e:
            print(f"ERROR: Failed to import rembg: {e}", file=sys.stderr)
            print("Make sure rembg is installed: pip install rembg", file=sys.stderr)
            return None
        
        try:
            input_image = Image.open(io.BytesIO(image_data))
            print(f"Successfully opened image: {input_image.format}, size: {input_image.size}", file=sys.stderr)
        except Exception as e:
            print(f"ERROR: Failed to open image: {e}", file=sys.stderr)
            return None
        
        try:
            print("Removing background...", file=sys.stderr)
            output_image = remove(input_image)
            print("Background removed successfully", file=sys.stderr)
        except Exception as e:
            print(f"ERROR: Failed to remove background: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return None
        
        try:
            output_buffer = io.BytesIO()
            output_image.save(output_buffer, format='PNG')
            output_buffer.seek(0)
            result = output_buffer.getvalue()
            print(f"Result image size: {len(result)} bytes", file=sys.stderr)
            return result
        except Exception as e:
            print(f"ERROR: Failed to save result image: {e}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None
    
if __name__ == "__main__":
    try:
        print("Reading image data from stdin...", file=sys.stderr)
        image_data = sys.stdin.buffer.read()
        print(f"Read {len(image_data)} bytes from stdin", file=sys.stderr)
        
        if len(image_data) == 0:
            print("ERROR: No data received from stdin", file=sys.stderr)
            sys.exit(1)
            
        result = remove_background(image_data)
        
        if result:
            print(f"Writing {len(result)} bytes to stdout...", file=sys.stderr)
            sys.stdout.buffer.write(result)
            print("Background removal completed successfully", file=sys.stderr)
        else:
            print("ERROR: Background removal failed", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"FATAL ERROR: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)