//
//  CWMagnifyingView.h
//  colorwheel
//
//  Created by Dan Zimmerman on 2/2/14.
//  Copyright (c) 2014 Dan Zimmerman. All rights reserved.
//

/*
 * @zdocs filedescription
 *
 * @title DZMagnifyingView Class Reference
 *
 * @#DZREADME.md
 *
 */

#import <UIKit/UIKit.h>

@interface DZMagnifyingView : UIView {
    UIImage *fullImage;
    CGAffineTransform rotationTransform;
    BOOL animating;
    CALayer *imageLayer;
    CAShapeLayer *borderLayer;
    BOOL queueHide;
}

@property (nonatomic) CGFloat closeupRadius;
@property (nonatomic) CGPoint closeupCenter;
@property (nonatomic) UIView *targetView;

- (void)show;
- (void)hide;

- (void)dosomething:(NSObject *)obja withAnotherString:(NSString *)str afterDelay:(CGFloat)flt;

@end

/*
 * @zdocs function
 *
 * @name dosmth
 *
 * @parameter ctx={void *} Context of doing something.
 *
 * @parameter n={int} Some int.
 *
 * @parameter f={float} Some float.
 *
 * @parameter c={char} Some char.
 *
 * @parameter str={char *} Some char array.
 *
 * @retval {void} Returns nothing.
 *
 * @description Yo yo yo I am a *G*
 *
 */
void dosmth(void *ctx, int n, float f, char c, char *str);

